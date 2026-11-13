// Package authtest is a fake OpenID Connect identity provider for tests:
// an HTTP server that publishes a discovery document, signing keys (JWKS)
// and a userinfo endpoint, and a way to mint access tokens. Everything
// about a token can be overridden, to build tokens that should be
// rejected.
package authtest

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/go-jose/go-jose/v4"
	"github.com/go-jose/go-jose/v4/jwt"
)

// Audience is the audience the fake provider issues tokens for.
const Audience = "writ-api-test"

// Paths the provider serves, as on Zitadel.
const (
	JWKSPath      = "/oauth/v2/keys"
	UserinfoPath  = "/oidc/v1/userinfo"
	discoveryPath = "/.well-known/openid-configuration"
)

// Profile is what the userinfo endpoint returns for one subject. Empty
// fields are left out of the response.
type Profile struct {
	Email         string
	EmailVerified bool
	Name          string
	Locale        string
}

// Provider is a running fake identity provider.
type Provider struct {
	server *httptest.Server

	mu      sync.Mutex
	key     *rsa.PrivateKey
	kid     string
	keys    []jose.JSONWebKey // every key published, current last
	down    bool
	fetches int

	profiles      map[string]Profile
	userinfoDown  bool
	userinfoCalls int
	// userinfoDelay makes each userinfo call slow, to widen the window in
	// which concurrent requests overlap.
	userinfoDelay time.Duration
}

// NewProvider starts a provider with one signing key. It stops when the
// test ends.
func NewProvider(t testing.TB) *Provider {
	t.Helper()
	p := &Provider{profiles: map[string]Profile{}}
	p.Rotate(t)
	mux := http.NewServeMux()
	mux.HandleFunc("GET "+JWKSPath, p.serveKeys)
	mux.HandleFunc("GET "+discoveryPath, p.serveDiscovery)
	mux.HandleFunc("GET "+UserinfoPath, p.serveUserinfo)
	p.server = httptest.NewServer(mux)
	t.Cleanup(p.server.Close)
	return p
}

func (p *Provider) serveKeys(w http.ResponseWriter, r *http.Request) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.fetches++
	if p.down {
		http.Error(w, "unavailable", http.StatusServiceUnavailable)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(jose.JSONWebKeySet{Keys: p.keys})
}

func (p *Provider) serveDiscovery(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{
		"issuer":            p.Issuer(),
		"jwks_uri":          p.JWKSURL(),
		"userinfo_endpoint": p.Issuer() + UserinfoPath,
	})
}

// serveUserinfo answers for the subject of the presented token. Being a
// fake, it reads the subject without verifying the signature.
func (p *Provider) serveUserinfo(w http.ResponseWriter, r *http.Request) {
	p.mu.Lock()
	p.userinfoCalls++
	down, delay := p.userinfoDown, p.userinfoDelay
	p.mu.Unlock()

	time.Sleep(delay)
	if down {
		http.Error(w, "unavailable", http.StatusServiceUnavailable)
		return
	}
	raw, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	token, err := jwt.ParseSigned(raw, []jose.SignatureAlgorithm{jose.RS256})
	var claims jwt.Claims
	if !ok || err != nil || token.UnsafeClaimsWithoutVerification(&claims) != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	p.mu.Lock()
	profile := p.profiles[claims.Subject]
	p.mu.Unlock()
	body := map[string]any{"sub": claims.Subject}
	if profile.Email != "" {
		body["email"] = profile.Email
		body["email_verified"] = profile.EmailVerified
	}
	if profile.Name != "" {
		body["name"] = profile.Name
	}
	if profile.Locale != "" {
		body["locale"] = profile.Locale
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(body)
}

// SetProfile sets what userinfo returns for a subject.
func (p *Provider) SetProfile(subject string, profile Profile) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.profiles[subject] = profile
}

// SetUserinfoDown makes the userinfo endpoint fail, or work again.
func (p *Provider) SetUserinfoDown(down bool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.userinfoDown = down
}

// SetUserinfoDelay makes every userinfo call take at least d.
func (p *Provider) SetUserinfoDelay(d time.Duration) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.userinfoDelay = d
}

// UserinfoCalls reports how many times userinfo has been called.
func (p *Provider) UserinfoCalls() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.userinfoCalls
}

// Issuer is the provider's issuer URL.
func (p *Provider) Issuer() string { return p.server.URL }

// JWKSURL is where the provider publishes its keys.
func (p *Provider) JWKSURL() string { return p.server.URL + JWKSPath }

// Fetches reports how many times the keys have been requested.
func (p *Provider) Fetches() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.fetches
}

// SetDown makes the key endpoint fail, or work again.
func (p *Provider) SetDown(down bool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.down = down
}

// Rotate starts signing with a new key. The old public key stays
// published, as a real provider keeps it until its tokens have expired.
func (p *Provider) Rotate(t testing.TB) {
	t.Helper()
	key := NewKey(t)
	p.mu.Lock()
	defer p.mu.Unlock()
	p.key = key
	p.kid = fmt.Sprintf("key-%c", "abcdefghij"[len(p.keys)%10])
	p.keys = append(p.keys, jose.JSONWebKey{Key: key.Public(), KeyID: p.kid, Algorithm: "RS256", Use: "sig"})
}

// NewKey generates an RSA key.
func NewKey(t testing.TB) *rsa.PrivateKey {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generating a key: %v", err)
	}
	return key
}

// Token describes an access token to mint. The zero value, with only
// Subject set, is a valid token.
type Token struct {
	Subject string
	// Issuer and Audience default to the provider's own.
	Issuer   string
	Audience []string
	// Expiry defaults to an hour from now; IssuedAt to now.
	Expiry   time.Time
	IssuedAt time.Time
	// NoExpiry leaves the exp claim out.
	NoExpiry bool
	// Extra claims, for example amr.
	Extra map[string]any

	// Key and KeyID default to the provider's current signing key. Set Key
	// to sign with a key the provider does not publish.
	Key   *rsa.PrivateKey
	KeyID *string
}

// Sign mints the token.
func (p *Provider) Sign(t testing.TB, tok Token) string {
	t.Helper()
	p.mu.Lock()
	key, kid := p.key, p.kid
	p.mu.Unlock()
	if tok.Key != nil {
		key = tok.Key
	}
	if tok.KeyID != nil {
		kid = *tok.KeyID
	}

	now := time.Now()
	if tok.Issuer == "" {
		tok.Issuer = p.Issuer()
	}
	if tok.Audience == nil {
		tok.Audience = []string{Audience}
	}
	if tok.IssuedAt.IsZero() {
		tok.IssuedAt = now
	}
	if tok.Expiry.IsZero() {
		tok.Expiry = now.Add(time.Hour)
	}
	claims := jwt.Claims{
		Issuer:   tok.Issuer,
		Subject:  tok.Subject,
		Audience: tok.Audience,
		IssuedAt: jwt.NewNumericDate(tok.IssuedAt),
		Expiry:   jwt.NewNumericDate(tok.Expiry),
	}
	if tok.NoExpiry {
		claims.Expiry = nil
	}

	opts := (&jose.SignerOptions{}).WithType("at+jwt")
	if kid != "" {
		opts = opts.WithHeader("kid", kid)
	}
	signer, err := jose.NewSigner(jose.SigningKey{Algorithm: jose.RS256, Key: key}, opts)
	if err != nil {
		t.Fatalf("creating the signer: %v", err)
	}
	builder := jwt.Signed(signer).Claims(claims)
	if tok.Extra != nil {
		builder = builder.Claims(tok.Extra)
	}
	raw, err := builder.Serialize()
	if err != nil {
		t.Fatalf("signing the token: %v", err)
	}
	return raw
}
