// Package e2e tests the API from the outside: real router, real
// PostgreSQL (through dbtest), and a fake identity provider. Nothing is
// stubbed between the HTTP request and the database.
package e2e

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Writ-HQ/writ/api/internal/apierror"
	"github.com/Writ-HQ/writ/api/internal/auth"
	"github.com/Writ-HQ/writ/api/internal/auth/authtest"
	"github.com/Writ-HQ/writ/api/internal/database/dbtest"
	"github.com/Writ-HQ/writ/api/internal/health"
	"github.com/Writ-HQ/writ/api/internal/httpserver"
	"github.com/Writ-HQ/writ/api/internal/oapi"
)

var db *dbtest.DB

func TestMain(m *testing.M) { os.Exit(dbtest.Run(m, &db)) }

// newAPI wires the API the way cmd/server does, against the fake provider.
func newAPI(t *testing.T) (http.Handler, *authtest.Provider) {
	t.Helper()
	idp := authtest.NewProvider(t)
	logger := slog.New(slog.DiscardHandler)
	authenticator := auth.NewService(auth.NewVerifier(auth.VerifierConfig{
		Issuer:   idp.Issuer(),
		Audience: authtest.Audience,
		JWKSURL:  idp.JWKSURL(),
	}), db.App)
	return httpserver.NewRouter(logger, authenticator, httpserver.Handlers{
		Health:  health.New(logger),
		Account: auth.NewHandler(),
	}), idp
}

func getMe(t *testing.T, api http.Handler, token string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/v1/me", nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	api.ServeHTTP(rec, req)
	return rec
}

func decode[T any](t *testing.T, rec *httptest.ResponseRecorder) T {
	t.Helper()
	var v T
	dec := json.NewDecoder(rec.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&v); err != nil {
		t.Fatalf("decoding %q: %v", rec.Body.String(), err)
	}
	return v
}

func newSubject() string { return "idp|" + uuid.NewString() }

func countUsers(t *testing.T, subject string) int {
	t.Helper()
	var n int
	err := db.Superuser.QueryRow(t.Context(), "SELECT count(*) FROM users WHERE external_auth_id = $1", subject).Scan(&n)
	if err != nil {
		t.Fatal(err)
	}
	return n
}

func TestGetMeCreatesTheUserOnFirstRequest(t *testing.T) {
	api, idp := newAPI(t)
	subject := newSubject()
	token := idp.Sign(t, authtest.Token{Subject: subject, Extra: map[string]any{
		"email": "sam.example@example.test", "email_verified": true,
		"name": "Sam Example", "locale": "fr-CA",
	}})

	rec := getMe(t, api, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /v1/me = %d (%s), want 200", rec.Code, rec.Body.String())
	}
	me := decode[oapi.CurrentUser](t, rec)
	if me.Email == nil || *me.Email != "sam.example@example.test" || me.DisplayName != "Sam Example" || me.Locale != "fr" {
		t.Errorf("body = %+v, want the profile from the token with locale fr", me)
	}
	if n := countUsers(t, subject); n != 1 {
		t.Fatalf("%d users for the subject, want 1", n)
	}

	// The same person again, even with different profile claims, is the
	// same unchanged user.
	again := decode[oapi.CurrentUser](t, getMe(t, api, idp.Sign(t, authtest.Token{Subject: subject, Extra: map[string]any{
		"email": "someone.else@example.test", "email_verified": true, "name": "Changed",
	}})))
	if again.Id != me.Id || *again.Email != *me.Email || again.DisplayName != me.DisplayName {
		t.Errorf("second request returned %+v, want the same user as the first", again)
	}
	if n := countUsers(t, subject); n != 1 {
		t.Errorf("%d users for the subject after a second request, want 1", n)
	}
}

func TestGetMeWithATokenThatCarriesNoProfile(t *testing.T) {
	api, idp := newAPI(t)
	subject := newSubject()

	rec := getMe(t, api, idp.Sign(t, authtest.Token{Subject: subject}))
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /v1/me = %d (%s), want 200", rec.Code, rec.Body.String())
	}
	me := decode[oapi.CurrentUser](t, rec)
	if me.Email != nil || me.DisplayName != "" || me.Locale != "en" {
		t.Errorf("body = %+v, want no email, no name and locale en", me)
	}
}

func TestAnUnverifiedEmailIsNotStored(t *testing.T) {
	api, idp := newAPI(t)
	subject := newSubject()

	rec := getMe(t, api, idp.Sign(t, authtest.Token{Subject: subject, Extra: map[string]any{
		"email": "unverified@example.test", "email_verified": false,
	}}))
	if me := decode[oapi.CurrentUser](t, rec); me.Email != nil {
		t.Errorf("an unverified address was stored")
	}
}

func TestConcurrentFirstRequestsCreateOneUser(t *testing.T) {
	api, idp := newAPI(t)
	subject := newSubject()
	token := idp.Sign(t, authtest.Token{Subject: subject})

	ids := make(chan uuid.UUID, 20)
	var wg sync.WaitGroup
	for range 20 {
		wg.Go(func() {
			rec := getMe(t, api, token)
			if rec.Code != http.StatusOK {
				t.Errorf("status = %d, want 200", rec.Code)
				return
			}
			ids <- decode[oapi.CurrentUser](t, rec).Id
		})
	}
	wg.Wait()
	close(ids)

	seen := map[uuid.UUID]bool{}
	for id := range ids {
		seen[id] = true
	}
	if len(seen) != 1 || countUsers(t, subject) != 1 {
		t.Errorf("20 concurrent first requests produced %d ids and %d rows, want 1 and 1", len(seen), countUsers(t, subject))
	}
}

func TestInvalidTokensGet401AndCreateNoUser(t *testing.T) {
	api, idp := newAPI(t)
	subject := newSubject()
	valid := idp.Sign(t, authtest.Token{Subject: subject})
	parts := strings.Split(valid, ".")

	tests := map[string]string{
		"missing":        "",
		"expired":        idp.Sign(t, authtest.Token{Subject: subject, Expiry: time.Now().Add(-5 * time.Minute)}),
		"wrong audience": idp.Sign(t, authtest.Token{Subject: subject, Audience: []string{"another-api"}}),
		"wrong issuer":   idp.Sign(t, authtest.Token{Subject: subject, Issuer: "https://someone-else.example.test"}),
		"tampered":       parts[0] + "." + parts[1] + "x." + parts[2],
		"forged":         idp.Sign(t, authtest.Token{Subject: subject, Key: authtest.NewKey(t)}),
		"not a token":    "not-a-token",
	}
	for name, token := range tests {
		t.Run(name, func(t *testing.T) {
			rec := getMe(t, api, token)
			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("status = %d, want 401", rec.Code)
			}
			if rec.Header().Get("WWW-Authenticate") == "" || rec.Header().Get("Content-Type") != "application/json" {
				t.Errorf("headers = %v, want a Bearer challenge and a JSON body", rec.Header())
			}
			body := decode[oapi.Error](t, rec)
			// Every rejection looks the same from outside.
			if body.Code != apierror.Unauthenticated || body.Message != "Authentication is required." ||
				body.RequestId == "" || body.Details != nil {
				t.Errorf("body = %+v, want the standard unauthenticated error", body)
			}
		})
	}
	if n := countUsers(t, subject); n != 0 {
		t.Errorf("rejected tokens created %d users", n)
	}

	// The baseline token really was valid, so the cases above failed for
	// the reason they name.
	if rec := getMe(t, api, valid); rec.Code != http.StatusOK {
		t.Errorf("the valid token = %d, want 200", rec.Code)
	}
}

func TestIdentityProviderOutageGets503(t *testing.T) {
	api, idp := newAPI(t)
	idp.SetDown(true)

	rec := getMe(t, api, idp.Sign(t, authtest.Token{Subject: newSubject()}))
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", rec.Code)
	}
	if body := decode[oapi.Error](t, rec); body.Code != apierror.ServiceUnavailable {
		t.Errorf("code = %q, want service_unavailable", body.Code)
	}
}

func TestProbesStayPublic(t *testing.T) {
	api, _ := newAPI(t)
	for _, path := range []string{"/healthz", "/readyz"} {
		rec := httptest.NewRecorder()
		api.ServeHTTP(rec, httptest.NewRequestWithContext(t.Context(), http.MethodGet, path, nil))
		if rec.Code != http.StatusOK {
			t.Errorf("GET %s without a token = %d, want 200", path, rec.Code)
		}
	}
}
