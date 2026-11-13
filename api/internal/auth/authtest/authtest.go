// Package authtest is a fake OpenID Connect identity provider for tests:
// an HTTP server that publishes signing keys as a JWKS document, and a way
// to mint access tokens signed with them. Everything about a token can be
// overridden, to build tokens that should be rejected.
package authtest

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/go-jose/go-jose/v4"
	"github.com/go-jose/go-jose/v4/jwt"
)

// Audience is the audience the fake provider issues tokens for.
const Audience = "writ-api-test"

// JWKSPath is where the keys are served, as on Zitadel.
const JWKSPath = "/oauth/v2/keys"

// Provider is a running fake identity provider.
type Provider struct {
	server *httptest.Server

	mu      sync.Mutex
	key     *rsa.PrivateKey
	kid     string
	keys    []jose.JSONWebKey // every key published, current last
	down    bool
	fetches int
}

// NewProvider starts a provider with one signing key. It stops when the
// test ends.
func NewProvider(t testing.TB) *Provider {
	t.Helper()
	p := &Provider{}
	p.Rotate(t)
	p.server = httptest.NewServer(http.HandlerFunc(p.serveKeys))
	t.Cleanup(p.server.Close)
	return p
}

func (p *Provider) serveKeys(w http.ResponseWriter, r *http.Request) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if r.URL.Path != JWKSPath {
		http.NotFound(w, r)
		return
	}
	p.fetches++
	if p.down {
		http.Error(w, "unavailable", http.StatusServiceUnavailable)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(jose.JSONWebKeySet{Keys: p.keys})
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
	// Extra claims, for example email, email_verified, name, locale.
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
