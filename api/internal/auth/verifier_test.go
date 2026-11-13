package auth_test

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Writ-HQ/writ/api/internal/auth"
	"github.com/Writ-HQ/writ/api/internal/auth/authtest"
)

// clock is a settable time source.
type clock struct {
	mu  sync.Mutex
	now time.Time
}

func newClock() *clock { return &clock{now: time.Now()} }

func (c *clock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

func (c *clock) Advance(d time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.now = c.now.Add(d)
}

func newVerifier(idp *authtest.Provider, c *clock) *auth.Verifier {
	return auth.NewVerifier(auth.VerifierConfig{
		Issuer:   idp.Issuer(),
		Audience: authtest.Audience,
		JWKSURL:  idp.JWKSURL(),
		Now:      c.Now,
	})
}

func b64(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }

// replacePayload swaps the claims of a signed token, keeping its header
// and signature.
func replacePayload(t *testing.T, token string, change func(claims map[string]any)) string {
	t.Helper()
	parts := strings.Split(token, ".")
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		t.Fatal(err)
	}
	var claims map[string]any
	if err := json.Unmarshal(payload, &claims); err != nil {
		t.Fatal(err)
	}
	change(claims)
	payload, err = json.Marshal(claims)
	if err != nil {
		t.Fatal(err)
	}
	return parts[0] + "." + b64(payload) + "." + parts[2]
}

func TestVerifyAcceptsAValidToken(t *testing.T) {
	idp := authtest.NewProvider(t)
	v := newVerifier(idp, newClock())

	claims, err := v.Verify(t.Context(), idp.Sign(t, authtest.Token{
		Subject: "idp|sam",
		// Zitadel puts several audiences in a token; ours is one of them.
		Audience: []string{"another-client", authtest.Audience},
		// Profile claims in an access token are ignored: the profile
		// comes from userinfo.
		Extra: map[string]any{"email": "sam.example@example.test", "email_verified": true},
	}))
	if err != nil {
		t.Fatalf("Verify() error = %v", err)
	}
	if claims.Subject != "idp|sam" || len(claims.AuthMethods) != 0 {
		t.Errorf("claims = %+v, want only the subject", claims)
	}
}

func TestVerifyReadsTheAuthenticationMethods(t *testing.T) {
	idp := authtest.NewProvider(t)

	tests := []struct {
		name  string
		claim string // configured claim name; "" for the default
		extra map[string]any
		want  []string
	}{
		{"an array", "", map[string]any{"amr": []string{"pwd", "otp"}}, []string{"pwd", "otp"}},
		{"a single string", "", map[string]any{"amr": "pwd"}, []string{"pwd"}},
		{"absent", "", nil, nil},
		{"not strings", "", map[string]any{"amr": []int{1, 2}}, nil},
		{"an object", "", map[string]any{"amr": map[string]any{"mfa": true}}, nil},
		{"another claim, as configured", "methods", map[string]any{"methods": []string{"mfa"}, "amr": []string{"pwd"}}, []string{"mfa"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := auth.NewVerifier(auth.VerifierConfig{
				Issuer: idp.Issuer(), Audience: authtest.Audience, JWKSURL: idp.JWKSURL(),
				AuthMethodsClaim: tt.claim,
			})
			claims, err := v.Verify(t.Context(), idp.Sign(t, authtest.Token{Subject: "idp|sam", Extra: tt.extra}))
			if err != nil {
				t.Fatalf("Verify() error = %v", err)
			}
			if !slices.Equal(claims.AuthMethods, tt.want) {
				t.Errorf("AuthMethods = %v, want %v", claims.AuthMethods, tt.want)
			}
		})
	}
}

func TestVerifyRejectsInvalidTokens(t *testing.T) {
	idp := authtest.NewProvider(t)
	c := newClock()
	v := newVerifier(idp, c)

	valid := idp.Sign(t, authtest.Token{Subject: "idp|sam"})
	if _, err := v.Verify(t.Context(), valid); err != nil {
		t.Fatalf("the baseline token is not valid: %v", err)
	}
	parts := strings.Split(valid, ".")
	otherKey := authtest.NewKey(t)
	empty := ""

	// A token "signed" with HMAC, using an RSA public key as the secret:
	// the shape of the classic algorithm-confusion forgery. HMAC is not
	// an allowed algorithm, so it is refused before any key is consulted.
	hmacForgery := func() string {
		publicKey, err := x509.MarshalPKIXPublicKey(otherKey.Public())
		if err != nil {
			t.Fatal(err)
		}
		signingInput := b64([]byte(`{"alg":"HS256","typ":"JWT","kid":"key-a"}`)) + "." + parts[1]
		mac := hmac.New(sha256.New, publicKey)
		mac.Write([]byte(signingInput))
		return signingInput + "." + b64(mac.Sum(nil))
	}()

	tests := map[string]string{
		"expired":                              idp.Sign(t, authtest.Token{Subject: "idp|sam", Expiry: c.Now().Add(-5 * time.Minute)}),
		"wrong audience":                       idp.Sign(t, authtest.Token{Subject: "idp|sam", Audience: []string{"another-api"}}),
		"no audience":                          idp.Sign(t, authtest.Token{Subject: "idp|sam", Audience: []string{}}),
		"wrong issuer":                         idp.Sign(t, authtest.Token{Subject: "idp|sam", Issuer: "https://someone-else.example.test"}),
		"issuer differing by a trailing slash": idp.Sign(t, authtest.Token{Subject: "idp|sam", Issuer: idp.Issuer() + "/"}),
		"not valid yet":                        idp.Sign(t, authtest.Token{Subject: "idp|sam", Extra: map[string]any{"nbf": c.Now().Add(10 * time.Minute).Unix()}}),
		"no expiry":                            idp.Sign(t, authtest.Token{Subject: "idp|sam", NoExpiry: true}),
		"no subject":                           idp.Sign(t, authtest.Token{}),

		"tampered payload": replacePayload(t, valid, func(claims map[string]any) { claims["sub"] = "idp|someone-else" }),
		"tampered expiry": replacePayload(t,
			idp.Sign(t, authtest.Token{Subject: "idp|sam", Expiry: c.Now().Add(-5 * time.Minute)}),
			func(claims map[string]any) { claims["exp"] = c.Now().Add(time.Hour).Unix() }),
		"tampered signature":                             parts[0] + "." + parts[1] + "." + b64([]byte(strings.Repeat("x", 256))),
		"signature removed":                              parts[0] + "." + parts[1] + ".",
		"signed by another key under a published key ID": idp.Sign(t, authtest.Token{Subject: "idp|sam", Key: otherKey}),
		"signed by a key the provider does not publish":  idp.Sign(t, authtest.Token{Subject: "idp|sam", Key: otherKey, KeyID: new("key-unknown")}),
		"no key ID":                idp.Sign(t, authtest.Token{Subject: "idp|sam", KeyID: &empty}),
		"algorithm none":           b64([]byte(`{"alg":"none","kid":"key-a"}`)) + "." + parts[1] + ".",
		"HMAC with the public key": hmacForgery,

		"not a token":  "not-a-token",
		"empty":        "",
		"far too long": strings.Repeat("a", 20<<10),
	}
	for name, token := range tests {
		t.Run(name, func(t *testing.T) {
			_, err := v.Verify(t.Context(), token)
			if !errors.Is(err, auth.ErrInvalidToken) {
				t.Fatalf("Verify() error = %v, want ErrInvalidToken", err)
			}
			// The reason goes to the logs: it must not quote the token.
			for _, part := range strings.Split(token, ".") {
				if len(part) > 20 && strings.Contains(err.Error(), part) {
					t.Errorf("the error quotes the token: %v", err)
				}
			}
		})
	}
}

func TestVerifyAllowsSmallClockDifferences(t *testing.T) {
	idp := authtest.NewProvider(t)
	c := newClock()
	v := newVerifier(idp, c)

	justExpired := idp.Sign(t, authtest.Token{Subject: "idp|sam", Expiry: c.Now().Add(-10 * time.Second)})
	if _, err := v.Verify(t.Context(), justExpired); err != nil {
		t.Errorf("a token 10 seconds past expiry was rejected: %v", err)
	}
	c.Advance(time.Minute)
	if _, err := v.Verify(t.Context(), justExpired); !errors.Is(err, auth.ErrInvalidToken) {
		t.Errorf("a token over a minute past expiry: err = %v, want ErrInvalidToken", err)
	}
}

func TestKeysAreCached(t *testing.T) {
	idp := authtest.NewProvider(t)
	c := newClock()
	v := newVerifier(idp, c)
	token := idp.Sign(t, authtest.Token{Subject: "idp|sam"})

	if idp.Fetches() != 0 {
		t.Fatalf("keys were fetched before any token arrived")
	}
	var wg sync.WaitGroup
	for range 50 {
		wg.Go(func() {
			if _, err := v.Verify(t.Context(), token); err != nil {
				t.Errorf("Verify() error = %v", err)
			}
		})
	}
	wg.Wait()
	if got := idp.Fetches(); got != 1 {
		t.Errorf("50 concurrent verifications fetched the keys %d times, want 1", got)
	}

	// Still cached well within an hour; fetched again after it.
	c.Advance(50 * time.Minute)
	if _, err := v.Verify(t.Context(), token); err != nil {
		t.Fatal(err)
	}
	if got := idp.Fetches(); got != 1 {
		t.Errorf("fetches after 50 minutes = %d, want 1", got)
	}
	c.Advance(20 * time.Minute)
	fresh := idp.Sign(t, authtest.Token{Subject: "idp|sam", Expiry: c.Now().Add(time.Hour)})
	if _, err := v.Verify(t.Context(), fresh); err != nil {
		t.Fatal(err)
	}
	if got := idp.Fetches(); got != 2 {
		t.Errorf("fetches after 70 minutes = %d, want 2", got)
	}
}

func TestKeyRotationIsPickedUp(t *testing.T) {
	idp := authtest.NewProvider(t)
	c := newClock()
	v := newVerifier(idp, c)

	old := idp.Sign(t, authtest.Token{Subject: "idp|sam"})
	if _, err := v.Verify(t.Context(), old); err != nil {
		t.Fatal(err)
	}

	idp.Rotate(t)
	rotated := idp.Sign(t, authtest.Token{Subject: "idp|sam"})

	// Within a minute of the last fetch the new key is not looked for,
	// which is the price of not letting unknown key IDs trigger fetches
	// at will.
	if _, err := v.Verify(t.Context(), rotated); !errors.Is(err, auth.ErrInvalidToken) {
		t.Errorf("straight after rotation: err = %v, want ErrInvalidToken", err)
	}
	c.Advance(61 * time.Second)
	if _, err := v.Verify(t.Context(), rotated); err != nil {
		t.Errorf("a minute after rotation the new key is still unknown: %v", err)
	}
	if _, err := v.Verify(t.Context(), old); err != nil {
		t.Errorf("the previous key stopped working while still published: %v", err)
	}
	if got := idp.Fetches(); got != 2 {
		t.Errorf("fetches = %d, want 2", got)
	}
}

func TestUnknownKeyIDsCannotForceFetches(t *testing.T) {
	idp := authtest.NewProvider(t)
	v := newVerifier(idp, newClock())
	other := authtest.NewKey(t)

	if _, err := v.Verify(t.Context(), idp.Sign(t, authtest.Token{Subject: "idp|sam"})); err != nil {
		t.Fatal(err)
	}
	for i := range 20 {
		kid := fmt.Sprintf("made-up-%d", i)
		_, err := v.Verify(t.Context(), idp.Sign(t, authtest.Token{Subject: "idp|sam", Key: other, KeyID: &kid}))
		if !errors.Is(err, auth.ErrInvalidToken) {
			t.Fatalf("err = %v, want ErrInvalidToken", err)
		}
	}
	if got := idp.Fetches(); got != 1 {
		t.Errorf("20 tokens with made-up key IDs caused %d fetches, want 1", got)
	}
}

func TestProviderOutage(t *testing.T) {
	t.Run("with no keys yet the answer is unavailable, not invalid", func(t *testing.T) {
		idp := authtest.NewProvider(t)
		c := newClock()
		v := newVerifier(idp, c)
		token := idp.Sign(t, authtest.Token{Subject: "idp|sam"})

		idp.SetDown(true)
		for range 3 {
			if _, err := v.Verify(t.Context(), token); !errors.Is(err, auth.ErrUnavailable) {
				t.Fatalf("err = %v, want ErrUnavailable", err)
			}
		}
		if got := idp.Fetches(); got != 1 {
			t.Errorf("a failing provider was asked %d times within a minute, want 1", got)
		}

		idp.SetDown(false)
		c.Advance(61 * time.Second)
		if _, err := v.Verify(t.Context(), token); err != nil {
			t.Errorf("after the provider recovered: %v", err)
		}
	})

	t.Run("cached keys keep working, even past their refresh time", func(t *testing.T) {
		idp := authtest.NewProvider(t)
		c := newClock()
		v := newVerifier(idp, c)
		if _, err := v.Verify(t.Context(), idp.Sign(t, authtest.Token{Subject: "idp|sam"})); err != nil {
			t.Fatal(err)
		}

		idp.SetDown(true)
		c.Advance(2 * time.Hour)
		token := idp.Sign(t, authtest.Token{Subject: "idp|sam", Expiry: c.Now().Add(time.Hour)})
		if _, err := v.Verify(t.Context(), token); err != nil {
			t.Errorf("a known key was refused during an outage: %v", err)
		}
		// A key that cannot be looked up is unknown, not invalid.
		other := authtest.NewKey(t)
		unknown := idp.Sign(t, authtest.Token{Subject: "idp|sam", Key: other, KeyID: new("key-new"), Expiry: c.Now().Add(time.Hour)})
		if _, err := v.Verify(t.Context(), unknown); !errors.Is(err, auth.ErrUnavailable) {
			t.Errorf("an unknown key during an outage: err = %v, want ErrUnavailable", err)
		}
	})
}
