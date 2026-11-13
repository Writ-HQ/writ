package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
)

// Metadata is the part of an OpenID Connect discovery document that Writ
// uses. Endpoints the provider does not offer are empty.
type Metadata struct {
	Issuer                      string `json:"issuer"`
	JWKSURI                     string `json:"jwks_uri"`
	UserinfoEndpoint            string `json:"userinfo_endpoint"`
	TokenEndpoint               string `json:"token_endpoint"`
	DeviceAuthorizationEndpoint string `json:"device_authorization_endpoint"`
}

const maxDiscoveryBytes = 1 << 20

// Discover fetches the issuer's discovery document
// (<issuer>/.well-known/openid-configuration) and checks it. The document
// must name the same issuer, as the specification requires, and every
// endpoint in it must be acceptable to CheckProviderURL: without those
// checks a tampered or misdirected document could send tokens elsewhere.
func Discover(ctx context.Context, client *http.Client, issuer string) (Metadata, error) {
	if err := CheckProviderURL(issuer); err != nil {
		return Metadata{}, fmt.Errorf("auth: the issuer %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		strings.TrimRight(issuer, "/")+"/.well-known/openid-configuration", nil)
	if err != nil {
		return Metadata{}, fmt.Errorf("auth: building the discovery request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return Metadata{}, fmt.Errorf("auth: fetching the discovery document: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return Metadata{}, fmt.Errorf("auth: fetching the discovery document: status %d", resp.StatusCode)
	}

	var meta Metadata
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxDiscoveryBytes)).Decode(&meta); err != nil {
		return Metadata{}, fmt.Errorf("auth: decoding the discovery document: %w", err)
	}
	if meta.Issuer != issuer {
		return Metadata{}, errors.New("auth: the discovery document names a different issuer")
	}
	for name, endpoint := range map[string]string{
		"jwks_uri":                      meta.JWKSURI,
		"userinfo_endpoint":             meta.UserinfoEndpoint,
		"token_endpoint":                meta.TokenEndpoint,
		"device_authorization_endpoint": meta.DeviceAuthorizationEndpoint,
	} {
		if endpoint == "" {
			continue
		}
		if err := CheckProviderURL(endpoint); err != nil {
			return Metadata{}, fmt.Errorf("auth: the discovery document's %s %w", name, err)
		}
	}
	return meta, nil
}

// CheckProviderURL reports whether v is acceptable as an identity provider
// URL. It requires HTTPS, because tokens and keys are only as trustworthy
// as the connection they travel over. Plain HTTP is accepted for a
// loopback address only, for local development and tests. The error
// reads as the end of a sentence ("... must use https") and never
// contains the URL.
func CheckProviderURL(v string) error {
	if v == "" {
		return errors.New("is required")
	}
	u, err := url.Parse(v)
	if err != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return errors.New("is not a plain URL such as https://auth.example.ca")
	}
	switch u.Scheme {
	case "https":
		return nil
	case "http":
		if ip := net.ParseIP(u.Hostname()); u.Hostname() == "localhost" || (ip != nil && ip.IsLoopback()) {
			return nil
		}
	}
	return errors.New("must use https")
}
