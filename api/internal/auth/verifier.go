package auth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-jose/go-jose/v4"
	"github.com/go-jose/go-jose/v4/jwt"
)

var (
	// ErrInvalidToken means the bearer token was rejected. The wrapped
	// reason is for logs only and must not be sent to the client.
	ErrInvalidToken = errors.New("auth: invalid token")
	// ErrUnavailable means the token could be neither accepted nor
	// rejected because the identity provider's keys could not be fetched.
	ErrUnavailable = errors.New("auth: identity provider keys are unavailable")
)

// Asymmetric algorithms only. "none" and the HMAC family are refused
// outright: with HMAC, anyone who knows the public key could sign.
var allowedAlgorithms = []jose.SignatureAlgorithm{
	jose.RS256, jose.RS384, jose.RS512,
	jose.PS256, jose.PS384, jose.PS512,
	jose.ES256, jose.ES384, jose.ES512,
	jose.EdDSA,
}

const (
	// Tolerance for clocks that disagree slightly.
	clockLeeway = 30 * time.Second
	// A real access token is a few hundred bytes to a few kilobytes.
	maxTokenBytes = 16 << 10
)

// Claims is what the API takes from a verified access token.
type Claims struct {
	// Subject is the identity provider's stable identifier for the user.
	Subject string
	// Email is set only when the token carries an address the provider
	// has verified.
	Email string
	// Name and Locale are empty when the token does not carry them.
	Name   string
	Locale string
}

// VerifierConfig configures a Verifier.
type VerifierConfig struct {
	// Issuer is the exact value required in the token's iss claim.
	Issuer string
	// Audience must be among the token's aud values.
	Audience string
	// JWKSURL is where the issuer publishes its signing keys.
	JWKSURL string
	// HTTPClient fetches the keys. Defaults to a client with a timeout.
	HTTPClient *http.Client
	// Now is the clock. Defaults to time.Now.
	Now func() time.Time
}

// Verifier checks access tokens issued by one OpenID Connect provider.
type Verifier struct {
	issuer   string
	audience string
	keys     *keySet
	now      func() time.Time
}

// NewVerifier returns a Verifier. It makes no network call: keys are
// fetched when the first token arrives, so the API can start while the
// identity provider is unreachable.
func NewVerifier(cfg VerifierConfig) *Verifier {
	if cfg.HTTPClient == nil {
		cfg.HTTPClient = &http.Client{Timeout: keyFetchTimeout}
	}
	if cfg.Now == nil {
		cfg.Now = time.Now
	}
	return &Verifier{
		issuer:   cfg.Issuer,
		audience: cfg.Audience,
		keys:     newKeySet(cfg.JWKSURL, cfg.HTTPClient, cfg.Now),
		now:      cfg.Now,
	}
}

// Verify checks the token's signature against the issuer's published
// keys, then its issuer, audience and validity period. It returns an
// error wrapping ErrInvalidToken or ErrUnavailable.
func (v *Verifier) Verify(ctx context.Context, raw string) (Claims, error) {
	if len(raw) > maxTokenBytes {
		return Claims{}, invalid("the token is too long")
	}
	token, err := jwt.ParseSigned(raw, allowedAlgorithms)
	if err != nil {
		// Not a JWT, or signed with an algorithm that is not allowed.
		return Claims{}, invalid("the token is not a JWT signed with an allowed algorithm")
	}
	if len(token.Headers) != 1 || token.Headers[0].KeyID == "" {
		return Claims{}, invalid("the token does not name its signing key")
	}

	key, found, err := v.keys.key(ctx, token.Headers[0].KeyID)
	if err != nil {
		return Claims{}, err
	}
	if !found {
		return Claims{}, invalid("the token is signed with a key the issuer does not publish")
	}

	var (
		registered jwt.Claims
		profile    struct {
			Email         string `json:"email"`
			EmailVerified bool   `json:"email_verified"`
			Name          string `json:"name"`
			Locale        string `json:"locale"`
		}
	)
	// Claims verifies the signature before it decodes anything.
	if err := token.Claims(key.Key, &registered, &profile); err != nil {
		return Claims{}, invalid("the signature does not verify")
	}

	// The library treats a missing expiry as "never expires".
	if registered.Expiry == nil {
		return Claims{}, invalid("the token has no expiry")
	}
	if registered.Subject == "" {
		return Claims{}, invalid("the token has no subject")
	}
	err = registered.ValidateWithLeeway(jwt.Expected{
		Issuer:      v.issuer,
		AnyAudience: jwt.Audience{v.audience},
		Time:        v.now(),
	}, clockLeeway)
	if err != nil {
		// These errors name the failed check and quote no claim values.
		return Claims{}, invalid(strings.TrimPrefix(err.Error(), "go-jose/go-jose/jwt: "))
	}

	claims := Claims{Subject: registered.Subject, Name: profile.Name, Locale: profile.Locale}
	if profile.EmailVerified {
		claims.Email = profile.Email
	}
	return claims, nil
}

func invalid(reason string) error {
	return fmt.Errorf("%w: %s", ErrInvalidToken, reason)
}
