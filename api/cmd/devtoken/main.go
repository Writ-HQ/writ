// Command devtoken signs a developer in to the identity provider and
// prints an access token, for calling a non-production API by hand:
//
//	TOKEN=$(go run ./cmd/devtoken -issuer https://auth.example.ca -client-id 123456)
//	curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/v1/me
//
// It uses the OAuth 2.0 device authorization flow (RFC 8628): it shows a
// URL and a code, the developer signs in with their browser, exactly as a
// user would, including the second factor, and the tool collects the
// token. No password passes through it and it needs no client secret.
//
// The token goes to standard output and nothing else does, so the command
// can be used in $(...). Everything for the person to read goes to
// standard error. A token is a credential: do not paste it into tickets
// or chat.
//
// With -claims it prints the token's claims as JSON instead of the token,
// to see what the provider puts in it (audience, authentication methods).
// The claims are decoded without checking the signature, which is fine
// for looking and useless for trusting. Claims are not a credential, but
// they do include personal data such as the subject identifier.
//
// Settings come from the environment: OIDC_ISSUER and
// OIDC_DEVTOKEN_CLIENT_ID.
//
// This is a development tool. It is not part of the API image.
package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"time"

	"github.com/Writ-HQ/writ/api/internal/auth"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	err := run(ctx, os.Args[1:], os.Getenv, os.Stdout, os.Stderr, sleep)
	stop()
	if err != nil {
		if !errors.Is(err, flag.ErrHelp) {
			fmt.Fprintln(os.Stderr, "devtoken:", err)
		}
		os.Exit(1)
	}
}

// sleep waits for d or until ctx is done.
func sleep(ctx context.Context, d time.Duration) error {
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

const (
	// offline_access asks for a refresh token as well, which the web app
	// will need; requesting it here keeps the token the same shape.
	defaultScope    = "openid profile email offline_access"
	defaultInterval = 5 * time.Second
	deviceGrantType = "urn:ietf:params:oauth:grant-type:device_code"
	maxResponseSize = 1 << 20
)

func run(ctx context.Context, args []string, getenv func(string) string, stdout, stderr io.Writer,
	sleep func(context.Context, time.Duration) error) error {
	flags := flag.NewFlagSet("devtoken", flag.ContinueOnError)
	flags.SetOutput(stderr)
	issuer := flags.String("issuer", getenv("OIDC_ISSUER"), "issuer URL of the identity provider (default $OIDC_ISSUER)")
	clientID := flags.String("client-id", getenv("OIDC_DEVTOKEN_CLIENT_ID"),
		"client ID of an application that allows the device code grant (default $OIDC_DEVTOKEN_CLIENT_ID)")
	scope := flags.String("scope", defaultScope, "space-separated scopes to request")
	showClaims := flags.Bool("claims", false, "print the token's decoded claims (unverified) instead of the token")
	if err := flags.Parse(args); err != nil {
		return err
	}
	if flags.NArg() != 0 {
		return errors.New("unexpected arguments; see -help")
	}
	if *issuer == "" || *clientID == "" {
		return errors.New("-issuer and -client-id are required (or OIDC_ISSUER and OIDC_DEVTOKEN_CLIENT_ID)")
	}

	client := &http.Client{Timeout: 15 * time.Second}
	meta, err := auth.Discover(ctx, client, *issuer)
	if err != nil {
		return err
	}
	if meta.DeviceAuthorizationEndpoint == "" || meta.TokenEndpoint == "" {
		return errors.New("the identity provider does not advertise the device authorization flow")
	}

	var device struct {
		DeviceCode              string `json:"device_code"`
		UserCode                string `json:"user_code"`
		VerificationURI         string `json:"verification_uri"`
		VerificationURIComplete string `json:"verification_uri_complete"`
		ExpiresIn               int    `json:"expires_in"`
		Interval                int    `json:"interval"`
	}
	oauthErr, err := postForm(ctx, client, meta.DeviceAuthorizationEndpoint, url.Values{
		"client_id": {*clientID},
		"scope":     {*scope},
	}, &device)
	if err != nil {
		return fmt.Errorf("starting the device flow: %w", err)
	}
	if oauthErr != "" {
		return fmt.Errorf("the identity provider refused to start the device flow: %s", oauthErr)
	}
	if device.DeviceCode == "" || device.UserCode == "" || device.VerificationURI == "" {
		return errors.New("the identity provider's device flow response is incomplete")
	}

	_, _ = fmt.Fprintf(stderr, "To sign in, open\n\n    %s\n\nand enter the code\n\n    %s\n\n", device.VerificationURI, device.UserCode)
	if device.VerificationURIComplete != "" {
		_, _ = fmt.Fprintf(stderr, "or open this, which carries the code:\n\n    %s\n\n", device.VerificationURIComplete)
	}
	_, _ = fmt.Fprintln(stderr, "Waiting for you to finish signing in...")

	interval := defaultInterval
	if device.Interval > 0 {
		interval = time.Duration(device.Interval) * time.Second
	}
	lifetime := 10 * time.Minute
	if device.ExpiresIn > 0 {
		lifetime = time.Duration(device.ExpiresIn) * time.Second
	}

	for waited := time.Duration(0); waited < lifetime; waited += interval {
		if err := sleep(ctx, interval); err != nil {
			return err
		}

		var token struct {
			AccessToken string `json:"access_token"`
			ExpiresIn   int    `json:"expires_in"`
		}
		oauthErr, err := postForm(ctx, client, meta.TokenEndpoint, url.Values{
			"grant_type":  {deviceGrantType},
			"device_code": {device.DeviceCode},
			"client_id":   {*clientID},
		}, &token)
		if err != nil {
			return fmt.Errorf("asking for the token: %w", err)
		}
		switch oauthErr {
		case "":
			if token.AccessToken == "" {
				return errors.New("the identity provider returned no access token")
			}
			_, _ = fmt.Fprintln(stderr, "Signed in.")
			if token.ExpiresIn > 0 {
				// Tokens are short-lived on purpose. The API answers 401
				// once this one expires; run the command again then.
				_, _ = fmt.Fprintf(stderr, "The token is valid for %s. Run this again when the API starts answering 401.\n",
					(time.Duration(token.ExpiresIn) * time.Second).Round(time.Minute))
			}
			if *showClaims {
				claims, err := decodeClaims(token.AccessToken)
				if err != nil {
					return err
				}
				_, _ = fmt.Fprintln(stderr, "Claims of the access token, NOT verified:")
				_, err = fmt.Fprintln(stdout, claims)
				return err
			}
			_, err := fmt.Fprintln(stdout, token.AccessToken)
			return err
		case "authorization_pending":
			// Not signed in yet; keep waiting.
		case "slow_down":
			// RFC 8628: wait five seconds longer between attempts.
			interval += 5 * time.Second
		case "access_denied":
			return errors.New("the sign-in was refused")
		case "expired_token":
			return errors.New("the code expired before the sign-in was finished; run the command again")
		default:
			return fmt.Errorf("the identity provider refused the request: %s", oauthErr)
		}
	}
	return errors.New("the code expired before the sign-in was finished; run the command again")
}

// decodeClaims returns the claims of a JWT as indented JSON. It does not
// verify the signature: it is for reading a token, never for trusting one.
func decodeClaims(token string) (string, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return "", errors.New("the access token is not a JWT; the application is probably set to issue opaque tokens")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", errors.New("the access token's claims are not valid base64url")
	}
	var indented bytes.Buffer
	if err := json.Indent(&indented, payload, "", "  "); err != nil {
		return "", errors.New("the access token's claims are not valid JSON")
	}
	return indented.String(), nil
}

// postForm posts a form and decodes a JSON response into out. An OAuth
// error response (RFC 6749 section 5.2) is returned as its error code,
// with the provider's description when it gave one; err is for everything
// else.
func postForm(ctx context.Context, client *http.Client, endpoint string, form url.Values, out any) (oauthErr string, err error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer func() { _ = resp.Body.Close() }()
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseSize))
	if err != nil {
		return "", err
	}

	if resp.StatusCode == http.StatusOK {
		// The body may hold a token, so a decode error is not wrapped.
		if json.Unmarshal(body, out) != nil {
			return "", errors.New("the response is not valid JSON")
		}
		return "", nil
	}

	var failure struct {
		Error string `json:"error"`
	}
	if json.Unmarshal(body, &failure) == nil && failure.Error != "" {
		return failure.Error, nil
	}
	return "", fmt.Errorf("unexpected status %d", resp.StatusCode)
}
