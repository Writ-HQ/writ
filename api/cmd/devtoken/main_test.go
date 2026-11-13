package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

// fakeProvider implements just enough of an identity provider for the
// device authorization flow.
type fakeProvider struct {
	*httptest.Server

	mu sync.Mutex
	// answers are the token endpoint's replies to successive polls: an
	// OAuth error code, or "" for success.
	answers []string
	polls   int
	// accessToken is what a successful poll returns.
	accessToken string
	// What the endpoints were sent.
	deviceForm, tokenForm map[string]string
	noDeviceFlow          bool
}

func newFakeProvider(t *testing.T, answers ...string) *fakeProvider {
	t.Helper()
	p := &fakeProvider{answers: answers, accessToken: "the-access-token"}
	mux := http.NewServeMux()
	writeJSON := func(w http.ResponseWriter, status int, v any) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(v)
	}
	form := func(r *http.Request) map[string]string {
		_ = r.ParseForm()
		out := map[string]string{}
		for k := range r.PostForm {
			out[k] = r.PostForm.Get(k)
		}
		return out
	}

	mux.HandleFunc("GET /.well-known/openid-configuration", func(w http.ResponseWriter, _ *http.Request) {
		doc := map[string]string{"issuer": p.URL, "token_endpoint": p.URL + "/token"}
		p.mu.Lock()
		if !p.noDeviceFlow {
			doc["device_authorization_endpoint"] = p.URL + "/device"
		}
		p.mu.Unlock()
		writeJSON(w, http.StatusOK, doc)
	})
	mux.HandleFunc("POST /device", func(w http.ResponseWriter, r *http.Request) {
		p.mu.Lock()
		p.deviceForm = form(r)
		p.mu.Unlock()
		writeJSON(w, http.StatusOK, map[string]any{
			"device_code": "device-code-1", "user_code": "WXYZ-1234",
			"verification_uri":          p.URL + "/activate",
			"verification_uri_complete": p.URL + "/activate?user_code=WXYZ-1234",
			"expires_in":                60, "interval": 2,
		})
	})
	mux.HandleFunc("POST /token", func(w http.ResponseWriter, r *http.Request) {
		p.mu.Lock()
		defer p.mu.Unlock()
		p.tokenForm = form(r)
		answer := "authorization_pending"
		if p.polls < len(p.answers) {
			answer = p.answers[p.polls]
		}
		p.polls++
		if answer != "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": answer})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"access_token": p.accessToken, "token_type": "Bearer", "expires_in": 3600})
	})
	p.Server = httptest.NewServer(mux)
	t.Cleanup(p.Close)
	return p
}

// sleeper records the waits instead of waiting.
type sleeper struct{ waits []time.Duration }

func (s *sleeper) sleep(_ context.Context, d time.Duration) error {
	s.waits = append(s.waits, d)
	return nil
}

func runTool(t *testing.T, p *fakeProvider, s *sleeper, args ...string) (stdout, stderr string, err error) {
	t.Helper()
	var out, errOut bytes.Buffer
	env := map[string]string{"OIDC_ISSUER": p.URL, "OIDC_DEVTOKEN_CLIENT_ID": "client-1"}
	err = run(t.Context(), args, func(k string) string { return env[k] }, &out, &errOut, s.sleep)
	return out.String(), errOut.String(), err
}

func TestPrintsOnlyTheTokenOnStdout(t *testing.T) {
	p := newFakeProvider(t, "authorization_pending", "authorization_pending", "")
	s := &sleeper{}

	stdout, stderr, err := runTool(t, p, s)
	if err != nil {
		t.Fatalf("run() error = %v", err)
	}
	if stdout != "the-access-token\n" {
		t.Errorf("stdout = %q, want only the token", stdout)
	}
	if !strings.Contains(stderr, "WXYZ-1234") || !strings.Contains(stderr, p.URL+"/activate") {
		t.Errorf("stderr does not show the code and URL:\n%s", stderr)
	}
	if !strings.Contains(stderr, "valid for 1h0m0s") {
		t.Errorf("stderr does not say how long the token lasts:\n%s", stderr)
	}
	if strings.Contains(stderr, "the-access-token") || strings.Contains(stderr, "device-code-1") {
		t.Errorf("stderr contains a credential:\n%s", stderr)
	}

	if p.deviceForm["client_id"] != "client-1" || p.deviceForm["scope"] != defaultScope {
		t.Errorf("device request = %v", p.deviceForm)
	}
	if p.tokenForm["grant_type"] != deviceGrantType || p.tokenForm["device_code"] != "device-code-1" || p.tokenForm["client_id"] != "client-1" {
		t.Errorf("token request = %v", p.tokenForm)
	}
	// It waits the interval the provider asked for before every poll.
	if len(s.waits) != 3 || s.waits[0] != 2*time.Second {
		t.Errorf("waits = %v, want three of 2s", s.waits)
	}
}

func TestSlowDownLengthensTheInterval(t *testing.T) {
	p := newFakeProvider(t, "slow_down", "")
	s := &sleeper{}
	if _, _, err := runTool(t, p, s); err != nil {
		t.Fatal(err)
	}
	if len(s.waits) != 2 || s.waits[1] != 7*time.Second {
		t.Errorf("waits = %v, want 2s then 7s", s.waits)
	}
}

func TestScopeFlag(t *testing.T) {
	p := newFakeProvider(t, "")
	if _, _, err := runTool(t, p, &sleeper{}, "-scope", "openid extra:scope"); err != nil {
		t.Fatal(err)
	}
	if p.deviceForm["scope"] != "openid extra:scope" {
		t.Errorf("scope = %q", p.deviceForm["scope"])
	}
}

func TestClaimsFlagPrintsTheClaimsInsteadOfTheToken(t *testing.T) {
	p := newFakeProvider(t, "")
	b64 := base64.RawURLEncoding.EncodeToString
	p.accessToken = b64([]byte(`{"alg":"RS256","kid":"key-a"}`)) + "." +
		b64([]byte(`{"iss":"https://auth.example.test","aud":["one","two"],"amr":["example"],"sub":"idp|sam"}`)) +
		".c2lnbmF0dXJl"

	stdout, stderr, err := runTool(t, p, &sleeper{}, "--claims")
	if err != nil {
		t.Fatalf("run() error = %v", err)
	}
	var claims struct {
		Aud []string `json:"aud"`
		Amr []string `json:"amr"`
	}
	if err := json.Unmarshal([]byte(stdout), &claims); err != nil {
		t.Fatalf("stdout is not JSON: %q", stdout)
	}
	if strings.Join(claims.Aud, ",") != "one,two" || strings.Join(claims.Amr, ",") != "example" {
		t.Errorf("claims = %+v", claims)
	}
	if strings.Contains(stdout+stderr, p.accessToken) || strings.Contains(stdout, "c2lnbmF0dXJl") {
		t.Errorf("the token itself was printed")
	}
	if !strings.Contains(stderr, "NOT verified") {
		t.Errorf("stderr does not say the claims are unverified: %s", stderr)
	}

	t.Run("an opaque token has no claims to show", func(t *testing.T) {
		p := newFakeProvider(t, "")
		stdout, _, err := runTool(t, p, &sleeper{}, "-claims")
		if err == nil || !strings.Contains(err.Error(), "not a JWT") || stdout != "" {
			t.Errorf("run() = %q, %v; want an error saying the token is not a JWT", stdout, err)
		}
	})
}

func TestFailures(t *testing.T) {
	tests := []struct {
		name    string
		answers []string
		setup   func(*fakeProvider)
		args    []string
		want    string
	}{
		{name: "refused", answers: []string{"access_denied"}, want: "refused"},
		{name: "expired", answers: []string{"expired_token"}, want: "expired"},
		{name: "never finished", want: "expired"},
		{name: "another error", answers: []string{"invalid_client"}, want: "invalid_client"},
		{name: "no device flow", setup: func(p *fakeProvider) { p.noDeviceFlow = true }, want: "device authorization flow"},
		{name: "stray argument", args: []string{"extra"}, want: "unexpected arguments"},
		{name: "http issuer that is not local", args: []string{"-issuer", "http://auth.example.ca"}, want: "https"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := newFakeProvider(t, tt.answers...)
			if tt.setup != nil {
				tt.setup(p)
			}
			stdout, _, err := runTool(t, p, &sleeper{}, tt.args...)
			if err == nil || !strings.Contains(err.Error(), tt.want) {
				t.Errorf("run() error = %v, want one containing %q", err, tt.want)
			}
			if stdout != "" {
				t.Errorf("stdout = %q on failure, want nothing", stdout)
			}
		})
	}

	t.Run("missing settings", func(t *testing.T) {
		var out, errOut bytes.Buffer
		err := run(t.Context(), nil, func(string) string { return "" }, &out, &errOut, (&sleeper{}).sleep)
		if err == nil || !strings.Contains(err.Error(), "required") {
			t.Errorf("run() error = %v, want one saying what is required", err)
		}
	})
}
