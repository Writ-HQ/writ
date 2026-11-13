package httpserver

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"slices"
	"strings"
	"testing"

	"github.com/Writ-HQ/writ/api/internal/apierror"
	"github.com/Writ-HQ/writ/api/internal/auth"
	"github.com/Writ-HQ/writ/api/internal/health"
	"github.com/Writ-HQ/writ/api/internal/oapi"
)

func request(t *testing.T, h http.Handler, method, path string, authorization ...string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequestWithContext(t.Context(), method, path, nil)
	for _, v := range authorization {
		req.Header.Add("Authorization", v)
	}
	req.Header.Set(RequestIDHeader, "req-auth")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestPublicEndpointsNeedNoToken(t *testing.T) {
	r := newTestRouter(discardLogger(), health.New(discardLogger()))
	for _, path := range []string{"/healthz", "/readyz"} {
		if rec := request(t, r, http.MethodGet, path); rec.Code != http.StatusOK {
			t.Errorf("GET %s without a token = %d, want 200", path, rec.Code)
		}
		// A bad token on a public endpoint is ignored, not rejected.
		if rec := request(t, r, http.MethodGet, path, "Bearer nonsense"); rec.Code != http.StatusOK {
			t.Errorf("GET %s with a bad token = %d, want 200", path, rec.Code)
		}
	}
}

func TestEverythingElseRequiresAToken(t *testing.T) {
	r := newTestRouter(discardLogger(), health.New(discardLogger()))

	tests := []struct {
		name, method, path string
		authorization      []string
		wantChallenge      string
	}{
		{"no header", http.MethodGet, "/v1/me", nil, "Bearer"},
		{"empty token", http.MethodGet, "/v1/me", []string{"Bearer "}, "Bearer"},
		{"another scheme", http.MethodGet, "/v1/me", []string{"Basic c2FtOnNlY3JldA=="}, "Bearer"},
		{"token without a scheme", http.MethodGet, "/v1/me", []string{stubToken}, "Bearer"},
		{"two headers", http.MethodGet, "/v1/me", []string{"Bearer " + stubToken, "Bearer " + stubToken}, "Bearer"},
		{"rejected token", http.MethodGet, "/v1/me", []string{"Bearer rejected"}, `Bearer error="invalid_token"`},
		// Without a token a caller cannot tell which paths exist.
		{"unknown path", http.MethodGet, "/v1/nothing-here", nil, "Bearer"},
		{"public path, other method", http.MethodPost, "/healthz", nil, "Bearer"},
		{"public path, trailing slash", http.MethodGet, "/healthz/", nil, "Bearer"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := request(t, r, tt.method, tt.path, tt.authorization...)
			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("status = %d, want 401", rec.Code)
			}
			if got := rec.Header().Get("WWW-Authenticate"); got != tt.wantChallenge {
				t.Errorf("WWW-Authenticate = %q, want %q", got, tt.wantChallenge)
			}
			body := decodeError(t, rec)
			if body.Code != apierror.Unauthenticated || body.Message != "Authentication is required." || body.RequestId != "req-auth" {
				t.Errorf("body = %+v, want the standard unauthenticated error", body)
			}
		})
	}
}

func TestAuthenticatedRequestReachesTheHandlerWithTheUser(t *testing.T) {
	r := newTestRouter(discardLogger(), health.New(discardLogger()))

	for _, header := range []string{"Bearer " + stubToken, "bearer " + stubToken, "BEARER  " + stubToken} {
		rec := request(t, r, http.MethodGet, "/v1/me", header)
		if rec.Code != http.StatusOK {
			t.Fatalf("GET /v1/me with %q = %d, want 200", header, rec.Code)
		}
		var me oapi.CurrentUser
		if err := json.Unmarshal(rec.Body.Bytes(), &me); err != nil {
			t.Fatal(err)
		}
		if me.Id != stubUser.ID || me.DisplayName != stubUser.DisplayName || me.Locale != "fr" || me.Email != nil {
			t.Errorf("body = %s, want the authenticated user", rec.Body.String())
		}
		// The key is present even when the address is unknown.
		if !strings.Contains(rec.Body.String(), `"email":null`) {
			t.Errorf("body = %s, want an explicit null email", rec.Body.String())
		}
	}
}

func TestAuthenticationFailuresOnOurSide(t *testing.T) {
	var logs bytes.Buffer
	r := newTestRouter(slog.New(slog.NewJSONHandler(&logs, nil)), health.New(discardLogger()))

	t.Run("identity provider unreachable", func(t *testing.T) {
		rec := request(t, r, http.MethodGet, "/v1/me", "Bearer idp-down")
		if rec.Code != http.StatusServiceUnavailable || rec.Header().Get("Retry-After") == "" {
			t.Errorf("status = %d, Retry-After = %q; want 503 with Retry-After", rec.Code, rec.Header().Get("Retry-After"))
		}
		if body := decodeError(t, rec); body.Code != apierror.ServiceUnavailable {
			t.Errorf("code = %q, want service_unavailable", body.Code)
		}
	})

	t.Run("database failure", func(t *testing.T) {
		rec := request(t, r, http.MethodGet, "/v1/me", "Bearer db-down")
		if rec.Code != http.StatusInternalServerError {
			t.Errorf("status = %d, want 500", rec.Code)
		}
		if strings.Contains(rec.Body.String(), "connection refused") {
			t.Errorf("body leaks the cause: %s", rec.Body.String())
		}
		if body := decodeError(t, rec); body.Code != apierror.InternalError {
			t.Errorf("code = %q, want internal_error", body.Code)
		}
	})

	t.Run("the reason for a rejection is logged, never the token", func(t *testing.T) {
		logs.Reset()
		rec := request(t, r, http.MethodGet, "/v1/me", "Bearer secret-looking-token")
		if strings.Contains(rec.Body.String(), "test reason") {
			t.Errorf("body reveals why the token was rejected: %s", rec.Body.String())
		}
		if !strings.Contains(logs.String(), "test reason") || !strings.Contains(logs.String(), "req-auth") {
			t.Errorf("log does not carry the reason and request ID: %s", logs.String())
		}
		if strings.Contains(logs.String(), "secret-looking-token") {
			t.Errorf("log contains the token: %s", logs.String())
		}
	})
}

// publicOperations must be exactly the operations the spec marks with
// `security: []`.
func TestPublicEndpointsMatchTheSpec(t *testing.T) {
	spec, err := os.ReadFile("../../../openapi/openapi.yaml")
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`(?m)^security:\n  - bearerAuth: \[\]$`).Match(spec) {
		t.Fatal("the spec no longer requires bearerAuth by default")
	}

	// Walk the paths section: a path line, then method lines, then the
	// operation's keys.
	var (
		public       []string
		path, method string
		pathLine     = regexp.MustCompile(`^  (/\S*):$`)
		methodLine   = regexp.MustCompile(`^    (get|put|post|delete|patch|head|options):$`)
		inPaths      bool
	)
	for _, line := range strings.Split(string(spec), "\n") {
		switch {
		case line == "paths:":
			inPaths = true
		case inPaths && line != "" && !strings.HasPrefix(line, " "):
			inPaths = false
		case !inPaths:
		case pathLine.MatchString(line):
			path = pathLine.FindStringSubmatch(line)[1]
		case methodLine.MatchString(line):
			method = strings.ToUpper(methodLine.FindStringSubmatch(line)[1])
		case line == "      security: []":
			public = append(public, method+" "+path)
		}
	}

	configured := slices.Clone(publicOperations)
	slices.Sort(public)
	slices.Sort(configured)
	if len(public) == 0 || !slices.Equal(public, configured) {
		t.Errorf("public operations in the spec = %v, publicOperations = %v", public, configured)
	}
}

func TestAccountDisabledHasItsOwnCode(t *testing.T) {
	var logs bytes.Buffer
	r := newTestRouter(slog.New(slog.NewJSONHandler(&logs, nil)), health.New(discardLogger()))

	rec := request(t, r, http.MethodGet, "/v1/me", "Bearer disabled")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
	// A plain challenge: signing in again would not help.
	if got := rec.Header().Get("WWW-Authenticate"); got != "Bearer" {
		t.Errorf("WWW-Authenticate = %q, want Bearer", got)
	}
	body := decodeError(t, rec)
	if body.Code != apierror.AccountDisabled || body.Message != "The account is disabled." {
		t.Errorf("body = %+v, want code account_disabled", body)
	}
	if !strings.Contains(logs.String(), "disabled") {
		t.Errorf("the rejection was not logged: %s", logs.String())
	}
}

func TestMFARequiredHasItsOwnCode(t *testing.T) {
	var logs bytes.Buffer
	r := newTestRouter(slog.New(slog.NewJSONHandler(&logs, nil)), health.New(discardLogger()))

	rec := request(t, r, http.MethodGet, "/v1/me", "Bearer no-mfa")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
	if got := rec.Header().Get("WWW-Authenticate"); got != `Bearer error="insufficient_user_authentication"` {
		t.Errorf("WWW-Authenticate = %q", got)
	}
	body := decodeError(t, rec)
	if body.Code != apierror.MFARequired || body.Message != "Multi-factor authentication is required." {
		t.Errorf("body = %+v, want code mfa_required", body)
	}
	if !strings.Contains(logs.String(), "multi-factor") {
		t.Errorf("the rejection was not logged: %s", logs.String())
	}
}

func TestDocs(t *testing.T) {
	logger := discardLogger()
	handlers := Handlers{Health: health.New(logger), Account: auth.NewHandler()}

	t.Run("served without a token when enabled", func(t *testing.T) {
		r := NewRouter(logger, stubAuthenticator{}, handlers, Options{Docs: true})

		page := request(t, r, http.MethodGet, "/docs")
		if page.Code != http.StatusOK || !strings.HasPrefix(page.Header().Get("Content-Type"), "text/html") {
			t.Fatalf("GET /docs = %d %q, want an HTML page", page.Code, page.Header().Get("Content-Type"))
		}
		// Third-party files are pinned by version and integrity hash.
		for _, want := range []string{"swagger-ui-dist@" + swaggerUIVersion, swaggerUIJSHash, swaggerUICSSHash, `src="/docs/init.js"`} {
			if !strings.Contains(page.Body.String(), want) {
				t.Errorf("the page does not contain %q", want)
			}
		}
		if csp := page.Header().Get("Content-Security-Policy"); !strings.Contains(csp, "default-src 'none'") || strings.Contains(csp, "script-src 'unsafe-inline'") {
			t.Errorf("Content-Security-Policy = %q", csp)
		}

		spec := request(t, r, http.MethodGet, "/docs/openapi.yaml")
		onDisk, err := os.ReadFile("../../../openapi/openapi.yaml")
		if err != nil {
			t.Fatal(err)
		}
		if spec.Code != http.StatusOK || !bytes.Equal(spec.Body.Bytes(), onDisk) {
			t.Errorf("GET /docs/openapi.yaml = %d, and the body is not openapi/openapi.yaml; run make generate", spec.Code)
		}

		if js := request(t, r, http.MethodGet, "/docs/init.js"); js.Code != http.StatusOK || !strings.Contains(js.Body.String(), "/docs/openapi.yaml") {
			t.Errorf("GET /docs/init.js = %d", js.Code)
		}

		// Only those exact routes are exempt.
		for _, path := range []string{"/docs/", "/docs/other", "/v1/me"} {
			if rec := request(t, r, http.MethodGet, path); rec.Code != http.StatusUnauthorized {
				t.Errorf("GET %s without a token = %d, want 401", path, rec.Code)
			}
		}
	})

	t.Run("absent when disabled", func(t *testing.T) {
		r := NewRouter(logger, stubAuthenticator{}, handlers, Options{})
		for _, endpoint := range docsEndpoints {
			path := strings.TrimPrefix(endpoint, "GET ")
			if rec := request(t, r, http.MethodGet, path); rec.Code != http.StatusUnauthorized {
				t.Errorf("GET %s without a token = %d, want 401", path, rec.Code)
			}
			if rec := request(t, r, http.MethodGet, path, "Bearer "+stubToken); rec.Code != http.StatusNotFound {
				t.Errorf("GET %s with a token = %d, want 404", path, rec.Code)
			}
		}
	})
}
