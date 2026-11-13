package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// Profile is what the identity provider's userinfo endpoint says about a
// user. A nil field was not in the response, typically because the token
// was not granted the profile or email scope.
type Profile struct {
	Subject string
	// Email is set only when the provider says it has verified the
	// address.
	Email  *string
	Name   *string
	Locale *string
}

// ProfileSource fetches a user's profile using their access token.
// *UserinfoClient implements it.
type ProfileSource interface {
	Profile(ctx context.Context, accessToken string) (Profile, error)
}

const (
	userinfoTimeout  = 5 * time.Second
	maxUserinfoBytes = 1 << 20
	// How long a discovered userinfo endpoint is used before discovery
	// runs again, and how long to wait after a failed discovery.
	discoveryMaxAge        = 24 * time.Hour
	discoveryRetryInterval = time.Minute
)

// UserinfoClient calls the userinfo endpoint named in the issuer's
// discovery document.
type UserinfoClient struct {
	issuer string
	client *http.Client
	now    func() time.Time

	mu           sync.Mutex
	endpoint     string
	discoveredAt time.Time
	attemptedAt  time.Time
}

// NewUserinfoClient returns a client for the issuer. It makes no network
// call until the first profile is requested. A nil client or clock uses
// the defaults.
func NewUserinfoClient(issuer string, client *http.Client, now func() time.Time) *UserinfoClient {
	if client == nil {
		client = &http.Client{Timeout: userinfoTimeout}
	}
	if now == nil {
		now = time.Now
	}
	return &UserinfoClient{issuer: issuer, client: client, now: now}
}

// Profile returns the profile of the user the access token belongs to.
func (c *UserinfoClient) Profile(ctx context.Context, accessToken string) (Profile, error) {
	endpoint, err := c.userinfoEndpoint(ctx)
	if err != nil {
		return Profile{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return Profile{}, fmt.Errorf("auth: building the userinfo request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return Profile{}, fmt.Errorf("auth: calling userinfo: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return Profile{}, fmt.Errorf("auth: calling userinfo: status %d", resp.StatusCode)
	}

	var body struct {
		Subject       string  `json:"sub"`
		Email         *string `json:"email"`
		EmailVerified bool    `json:"email_verified"`
		Name          *string `json:"name"`
		Locale        *string `json:"locale"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxUserinfoBytes)).Decode(&body); err != nil {
		// The decode error could quote the response, which is personal
		// data, so it is not wrapped.
		return Profile{}, errors.New("auth: the userinfo response is not valid JSON")
	}
	if body.Subject == "" {
		return Profile{}, errors.New("auth: the userinfo response has no subject")
	}

	profile := Profile{Subject: body.Subject, Name: body.Name, Locale: body.Locale}
	if body.EmailVerified {
		profile.Email = body.Email
	}
	return profile, nil
}

// userinfoEndpoint returns the discovered endpoint, running discovery when
// it is not known or is old. A failed discovery is not retried for a
// minute, and an endpoint discovered earlier keeps being used meanwhile.
func (c *UserinfoClient) userinfoEndpoint(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := c.now()
	if c.endpoint != "" && now.Sub(c.discoveredAt) < discoveryMaxAge {
		return c.endpoint, nil
	}
	if !c.attemptedAt.IsZero() && now.Sub(c.attemptedAt) < discoveryRetryInterval {
		if c.endpoint != "" {
			return c.endpoint, nil
		}
		return "", errors.New("auth: discovery failed recently and has not been retried yet")
	}

	c.attemptedAt = now
	meta, err := Discover(ctx, c.client, c.issuer)
	if err == nil && meta.UserinfoEndpoint == "" {
		err = errors.New("auth: the discovery document has no userinfo_endpoint")
	}
	if err != nil {
		if c.endpoint != "" {
			return c.endpoint, nil
		}
		return "", err
	}
	c.endpoint, c.discoveredAt = meta.UserinfoEndpoint, now
	return c.endpoint, nil
}
