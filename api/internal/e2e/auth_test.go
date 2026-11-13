// Package e2e tests the API from the outside: real router, real
// PostgreSQL (through dbtest), and a fake identity provider. Nothing is
// stubbed between the HTTP request and the database.
package e2e

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/Writ-HQ/writ/api/internal/apierror"
	"github.com/Writ-HQ/writ/api/internal/auth"
	"github.com/Writ-HQ/writ/api/internal/auth/authdb"
	"github.com/Writ-HQ/writ/api/internal/auth/authtest"
	"github.com/Writ-HQ/writ/api/internal/database"
	"github.com/Writ-HQ/writ/api/internal/database/dbtest"
	"github.com/Writ-HQ/writ/api/internal/health"
	"github.com/Writ-HQ/writ/api/internal/httpserver"
	"github.com/Writ-HQ/writ/api/internal/oapi"
)

var db *dbtest.DB

func TestMain(m *testing.M) { os.Exit(dbtest.Run(m, &db)) }

// testAPI is the API wired the way cmd/server wires it, against a fake
// identity provider and with a clock the test controls.
type testAPI struct {
	http.Handler
	idp *authtest.Provider

	mu  sync.Mutex
	now time.Time
}

func (a *testAPI) Now() time.Time {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.now
}

func (a *testAPI) Advance(d time.Duration) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.now = a.now.Add(d)
}

func newAPI(t *testing.T, opts auth.Options) *testAPI {
	t.Helper()
	api := &testAPI{idp: authtest.NewProvider(t), now: time.Now()}
	logger := slog.New(slog.DiscardHandler)

	opts.Profiles = auth.NewUserinfoClient(api.idp.Issuer(), nil, api.Now)
	opts.Now = api.Now
	authenticator := auth.NewService(auth.NewVerifier(auth.VerifierConfig{
		Issuer:   api.idp.Issuer(),
		Audience: authtest.Audience,
		JWKSURL:  api.idp.JWKSURL(),
		Now:      api.Now,
	}), db.App, opts)
	api.Handler = httpserver.NewRouter(logger, authenticator, httpserver.Handlers{
		Health:  health.New(logger),
		Account: auth.NewHandler(),
	}, httpserver.Options{})
	return api
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

// me calls GET /v1/me and requires 200.
func me(t *testing.T, api http.Handler, token string) oapi.CurrentUser {
	t.Helper()
	rec := getMe(t, api, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /v1/me = %d (%s), want 200", rec.Code, rec.Body.String())
	}
	return decode[oapi.CurrentUser](t, rec)
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

// events returns the user's security event types, oldest first, read the
// way the user themselves would read them.
func events(t *testing.T, userID uuid.UUID) []string {
	t.Helper()
	var types []string
	err := database.WithUser(t.Context(), db.App, userID, func(tx pgx.Tx) error {
		rows, err := authdb.New(tx).ListSecurityEventsForCurrentUser(t.Context(), 100)
		for _, row := range rows {
			if row.UserID != userID || string(row.Metadata) != "{}" {
				t.Errorf("unexpected event %+v", row)
			}
			types = append(types, row.EventType)
		}
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	slices.Reverse(types)
	return types
}

var samProfile = authtest.Profile{
	Email: "sam.example@example.test", EmailVerified: true, Name: "Sam Example", Locale: "fr-CA",
}

func TestFirstRequestCreatesTheUserWithTheProviderProfile(t *testing.T) {
	api := newAPI(t, auth.Options{})
	subject := newSubject()
	api.idp.SetProfile(subject, samProfile)
	// Profile claims in the access token itself are not used.
	token := api.idp.Sign(t, authtest.Token{Subject: subject, Extra: map[string]any{
		"email": "from.the.token@example.test", "email_verified": true, "name": "From The Token",
	}})

	first := me(t, api, token)
	if first.Email == nil || *first.Email != samProfile.Email || first.DisplayName != samProfile.Name || first.Locale != "fr" {
		t.Errorf("body = %+v, want the profile from userinfo with locale fr", first)
	}
	if n := countUsers(t, subject); n != 1 {
		t.Fatalf("%d users for the subject, want 1", n)
	}

	// Later requests return the same user without asking the provider.
	api.idp.SetProfile(subject, authtest.Profile{Email: "new.address@example.test", EmailVerified: true, Name: "New Name"})
	for range 3 {
		again := me(t, api, token)
		if again.Id != first.Id || *again.Email != *first.Email || again.DisplayName != first.DisplayName {
			t.Errorf("a later request returned %+v, want the stored profile", again)
		}
	}
	if calls := api.idp.UserinfoCalls(); calls != 1 {
		t.Errorf("userinfo was called %d times, want 1", calls)
	}
	if got := events(t, first.Id); !slices.Equal(got, []string{"user.provisioned"}) {
		t.Errorf("security events = %v, want only user.provisioned", got)
	}
}

func TestProfileIsRefreshedAfter24Hours(t *testing.T) {
	api := newAPI(t, auth.Options{})
	subject := newSubject()
	api.idp.SetProfile(subject, samProfile)
	token := func() string {
		return api.idp.Sign(t, authtest.Token{Subject: subject, Expiry: time.Now().Add(100 * time.Hour)})
	}
	first := me(t, api, token())

	api.idp.SetProfile(subject, authtest.Profile{Email: "sam.renamed@example.test", EmailVerified: true, Name: "Sam Renamed", Locale: "en"})

	api.Advance(23 * time.Hour)
	if got := me(t, api, token()); got.DisplayName != samProfile.Name || api.idp.UserinfoCalls() != 1 {
		t.Errorf("after 23 hours: name %q and %d userinfo calls, want the stored profile and 1 call", got.DisplayName, api.idp.UserinfoCalls())
	}

	api.Advance(2 * time.Hour)
	got := me(t, api, token())
	if got.Id != first.Id || *got.Email != "sam.renamed@example.test" || got.DisplayName != "Sam Renamed" || got.Locale != "en" {
		t.Errorf("after 25 hours: %+v, want the refreshed profile", got)
	}
	if calls := api.idp.UserinfoCalls(); calls != 2 {
		t.Errorf("userinfo was called %d times, want 2", calls)
	}
	if got := events(t, first.Id); !slices.Equal(got, []string{"user.provisioned", "profile.email_changed"}) {
		t.Errorf("security events = %v, want user.provisioned then profile.email_changed", got)
	}
}

func TestOnlyAVerifiedEmailIsStored(t *testing.T) {
	api := newAPI(t, auth.Options{})

	t.Run("an unverified address on first sight is not stored", func(t *testing.T) {
		subject := newSubject()
		api.idp.SetProfile(subject, authtest.Profile{Email: "unverified@example.test", EmailVerified: false, Name: "Sam Example"})
		got := me(t, api, api.idp.Sign(t, authtest.Token{Subject: subject}))
		if got.Email != nil || got.DisplayName != "Sam Example" {
			t.Errorf("body = %+v, want the name but no email", got)
		}
	})

	t.Run("an unverified address does not replace a verified one", func(t *testing.T) {
		subject := newSubject()
		api.idp.SetProfile(subject, samProfile)
		token := api.idp.Sign(t, authtest.Token{Subject: subject, Expiry: time.Now().Add(100 * time.Hour)})
		first := me(t, api, token)

		api.idp.SetProfile(subject, authtest.Profile{Email: "unverified@example.test", EmailVerified: false, Name: "Sam Example"})
		api.Advance(25 * time.Hour)
		got := me(t, api, token)
		if got.Email == nil || *got.Email != samProfile.Email {
			t.Errorf("the verified address was replaced or dropped: %+v", got)
		}
		if got := events(t, first.Id); !slices.Equal(got, []string{"user.provisioned"}) {
			t.Errorf("security events = %v, want no email change", got)
		}
	})
}

func TestAProfileWithNothingInItLeavesTheUserUsable(t *testing.T) {
	api := newAPI(t, auth.Options{})
	got := me(t, api, api.idp.Sign(t, authtest.Token{Subject: newSubject()}))
	if got.Email != nil || got.DisplayName != "" || got.Locale != "en" {
		t.Errorf("body = %+v, want no email, no name and locale en", got)
	}
}

func TestUserinfoFailureDoesNotFailTheRequest(t *testing.T) {
	api := newAPI(t, auth.Options{})
	subject := newSubject()
	api.idp.SetProfile(subject, samProfile)
	token := api.idp.Sign(t, authtest.Token{Subject: subject})

	api.idp.SetUserinfoDown(true)
	first := me(t, api, token)
	if first.Email != nil || first.DisplayName != "" {
		t.Errorf("body = %+v, want an empty profile while userinfo is down", first)
	}
	// It is not retried on every request...
	me(t, api, token)
	me(t, api, token)
	if calls := api.idp.UserinfoCalls(); calls != 1 {
		t.Errorf("userinfo was called %d times while failing, want 1", calls)
	}

	// ...but it is retried later, and then the profile arrives.
	api.idp.SetUserinfoDown(false)
	api.Advance(2 * time.Minute)
	got := me(t, api, token)
	if got.Id != first.Id || got.Email == nil || *got.Email != samProfile.Email {
		t.Errorf("after userinfo recovered: %+v, want the profile", got)
	}

	t.Run("a stored profile survives a failed refresh", func(t *testing.T) {
		api.idp.SetUserinfoDown(true)
		api.Advance(25 * time.Hour)
		long := api.idp.Sign(t, authtest.Token{Subject: subject, Expiry: time.Now().Add(100 * time.Hour)})
		got := me(t, api, long)
		if got.Email == nil || *got.Email != samProfile.Email || got.DisplayName != samProfile.Name {
			t.Errorf("a failed refresh changed the stored profile: %+v", got)
		}
	})
}

func TestUserinfoForAnotherSubjectIsNotUsed(t *testing.T) {
	api := newAPI(t, auth.Options{})
	subject := newSubject()
	api.idp.SetProfile(subject, samProfile)

	// A verifier-valid token whose userinfo answers for someone else
	// cannot happen with an honest provider; the check exists anyway.
	// Here it is exercised through a profile source that lies.
	authenticator := auth.NewService(auth.NewVerifier(auth.VerifierConfig{
		Issuer: api.idp.Issuer(), Audience: authtest.Audience, JWKSURL: api.idp.JWKSURL(),
	}), db.App, auth.Options{Profiles: lyingProfiles{}})

	user, err := authenticator.Authenticate(t.Context(), api.idp.Sign(t, authtest.Token{Subject: subject}))
	if err != nil {
		t.Fatalf("Authenticate() error = %v", err)
	}
	if user.Email != nil || user.DisplayName != "" {
		t.Errorf("a profile for another subject was stored: %+v", user.ID)
	}
}

type lyingProfiles struct{}

func (lyingProfiles) Profile(context.Context, string) (auth.Profile, error) {
	return auth.Profile{Subject: "idp|someone-else", Email: new("someone.else@example.test"), Name: new("Someone Else")}, nil
}

func TestConcurrentFirstRequestsCreateOneUserAndCallUserinfoOnce(t *testing.T) {
	api := newAPI(t, auth.Options{})
	subject := newSubject()
	api.idp.SetProfile(subject, samProfile)
	api.idp.SetUserinfoDelay(100 * time.Millisecond)
	token := api.idp.Sign(t, authtest.Token{Subject: subject})

	results := make(chan oapi.CurrentUser, 20)
	var wg sync.WaitGroup
	for range 20 {
		wg.Go(func() {
			rec := getMe(t, api, token)
			if rec.Code != http.StatusOK {
				t.Errorf("status = %d, want 200", rec.Code)
				return
			}
			results <- decode[oapi.CurrentUser](t, rec)
		})
	}
	wg.Wait()
	close(results)

	ids := map[uuid.UUID]bool{}
	for got := range results {
		ids[got.Id] = true
		// Every one of them sees the synced profile, not an empty one.
		if got.Email == nil || got.DisplayName != samProfile.Name {
			t.Errorf("a concurrent request saw an unsynced profile: %+v", got)
		}
	}
	if len(ids) != 1 || countUsers(t, subject) != 1 {
		t.Errorf("20 concurrent first requests produced %d ids and %d rows, want 1 and 1", len(ids), countUsers(t, subject))
	}
	if calls := api.idp.UserinfoCalls(); calls != 1 {
		t.Errorf("20 concurrent first requests called userinfo %d times, want 1", calls)
	}
}

// Access tokens live for an hour. A session is therefore a series of
// tokens for the same user, each refused soon after it expires.
func TestShortLivedTokens(t *testing.T) {
	api := newAPI(t, auth.Options{})
	subject := newSubject()
	api.idp.SetProfile(subject, samProfile)
	hourToken := func() string {
		return api.idp.Sign(t, authtest.Token{Subject: subject, IssuedAt: api.Now(), Expiry: api.Now().Add(time.Hour)})
	}

	first := hourToken()
	user := me(t, api, first)

	api.Advance(59 * time.Minute)
	if got := me(t, api, first); got.Id != user.Id {
		t.Errorf("at 59 minutes: id = %s, want %s", got.Id, user.Id)
	}

	// Past the hour, and past the 30 seconds allowed for clock
	// differences, it is an ordinary 401: the client refreshes the token.
	api.Advance(2 * time.Minute)
	rec := getMe(t, api, first)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("at 61 minutes: status = %d, want 401", rec.Code)
	}
	if body := decode[oapi.Error](t, rec); body.Code != apierror.Unauthenticated {
		t.Errorf("code = %q, want unauthenticated", body.Code)
	}

	// The next token is the same user, with nothing created or re-fetched.
	second := hourToken()
	if got := me(t, api, second); got.Id != user.Id || got.Email == nil || *got.Email != samProfile.Email {
		t.Errorf("with a fresh token: %+v, want the same user and profile", got)
	}
	if n := countUsers(t, subject); n != 1 {
		t.Errorf("%d users for the subject, want 1", n)
	}
	if calls := api.idp.UserinfoCalls(); calls != 1 {
		t.Errorf("userinfo was called %d times across two tokens, want 1", calls)
	}
	if fetches := api.idp.Fetches(); fetches != 2 {
		// One at the start and one when the keys passed an hour old; a
		// new token by itself causes none.
		t.Errorf("the keys were fetched %d times, want 2", fetches)
	}

	// A day of hourly tokens: the profile is refreshed once, with
	// whichever token is current when it falls due.
	for range 25 {
		api.Advance(time.Hour)
		me(t, api, hourToken())
	}
	if calls := api.idp.UserinfoCalls(); calls != 2 {
		t.Errorf("userinfo was called %d times over 26 hours, want 2", calls)
	}
}

// setDisabled disables or re-enables a user the way an operator does until
// admin tooling exists: as the owner role, acting for that user.
func setDisabled(t *testing.T, userID uuid.UUID, disabled bool) {
	t.Helper()
	err := database.WithUser(t.Context(), db.Owner, userID, func(tx pgx.Tx) error {
		sql := "UPDATE users SET disabled_at = NULL WHERE id = $1"
		if disabled {
			sql = "UPDATE users SET disabled_at = now() WHERE id = $1"
		}
		tag, err := tx.Exec(t.Context(), sql, userID)
		if err == nil && tag.RowsAffected() != 1 {
			t.Errorf("changed %d users, want 1", tag.RowsAffected())
		}
		return err
	})
	if err != nil {
		t.Fatalf("setting disabled=%v: %v", disabled, err)
	}
}

func TestDisabledAccountIsRefusedOnTheNextRequest(t *testing.T) {
	api := newAPI(t, auth.Options{})
	subject := newSubject()
	api.idp.SetProfile(subject, samProfile)
	// One token throughout: it stays perfectly valid, which is the point.
	token := api.idp.Sign(t, authtest.Token{Subject: subject, Expiry: time.Now().Add(100 * time.Hour)})
	user := me(t, api, token)

	setDisabled(t, user.Id, true)

	for range 2 {
		rec := getMe(t, api, token)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want 401", rec.Code)
		}
		if body := decode[oapi.Error](t, rec); body.Code != apierror.AccountDisabled {
			t.Errorf("code = %q, want account_disabled", body.Code)
		}
	}

	// Nothing is done on behalf of a disabled account: even a profile due
	// for a refresh is not fetched.
	api.Advance(25 * time.Hour)
	if rec := getMe(t, api, token); rec.Code != http.StatusUnauthorized {
		t.Errorf("status after 25 hours = %d, want 401", rec.Code)
	}
	if calls := api.idp.UserinfoCalls(); calls != 1 {
		t.Errorf("userinfo was called %d times, want only the first sync", calls)
	}

	// Another user is unaffected.
	other := newSubject()
	me(t, api, api.idp.Sign(t, authtest.Token{Subject: other, Expiry: api.Now().Add(time.Hour)}))

	setDisabled(t, user.Id, false)
	if got := me(t, api, token); got.Id != user.Id {
		t.Errorf("after re-enabling: id = %s, want %s", got.Id, user.Id)
	}

	if got := events(t, user.Id); !slices.Equal(got, []string{"user.provisioned", "account.disabled", "account.enabled"}) {
		t.Errorf("security events = %v, want provisioned, disabled, enabled", got)
	}
}

func TestMFA(t *testing.T) {
	// The method values here are this test's own. What a real provider
	// puts in the claim must be read from one of its tokens.
	api := newAPI(t, auth.Options{RequireMFA: true, MFAMethods: []string{"test-mfa", "test-otp"}})
	subject := newSubject()
	api.idp.SetProfile(subject, samProfile)
	sign := func(amr any) string {
		tok := authtest.Token{Subject: subject}
		if amr != nil {
			tok.Extra = map[string]any{"amr": amr}
		}
		return api.idp.Sign(t, tok)
	}

	for name, amr := range map[string]any{
		"no claim":           nil,
		"a single factor":    []string{"test-pwd"},
		"an empty list":      []string{},
		"a similar value":    []string{"test-mfa-not"},
		"a different casing": []string{"TEST-MFA"},
	} {
		t.Run("rejected: "+name, func(t *testing.T) {
			rec := getMe(t, api, sign(amr))
			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("status = %d, want 401", rec.Code)
			}
			if body := decode[oapi.Error](t, rec); body.Code != apierror.MFARequired {
				t.Errorf("code = %q, want mfa_required", body.Code)
			}
		})
	}

	// The user exists, so the rejection can be recorded against them, but
	// their profile was not fetched and the event is written once, not
	// once per attempt.
	var userID uuid.UUID
	err := db.Superuser.QueryRow(t.Context(), "SELECT id FROM users WHERE external_auth_id = $1", subject).Scan(&userID)
	if err != nil {
		t.Fatalf("the rejected user was not provisioned: %v", err)
	}
	if got := events(t, userID); !slices.Equal(got, []string{"user.provisioned", "auth.mfa_required"}) {
		t.Errorf("security events = %v, want user.provisioned and one auth.mfa_required", got)
	}
	if calls := api.idp.UserinfoCalls(); calls != 0 {
		t.Errorf("userinfo was called %d times for rejected tokens, want 0", calls)
	}

	api.Advance(11 * time.Minute)
	getMe(t, api, sign([]string{"test-pwd"}))
	if got := events(t, userID); len(got) != 3 {
		t.Errorf("after 11 minutes a new rejection was not recorded: %v", got)
	}

	for name, amr := range map[string]any{
		"an accepted method":             []string{"test-pwd", "test-mfa"},
		"another accepted method":        []string{"test-otp"},
		"an accepted method as a string": "test-mfa",
	} {
		t.Run("accepted: "+name, func(t *testing.T) {
			if got := me(t, api, sign(amr)); got.Id != userID {
				t.Errorf("id = %s, want %s", got.Id, userID)
			}
		})
	}

	t.Run("not required by default", func(t *testing.T) {
		open := newAPI(t, auth.Options{})
		me(t, open, open.idp.Sign(t, authtest.Token{Subject: newSubject()}))
	})
}

func TestInvalidTokensGet401AndCreateNoUser(t *testing.T) {
	api := newAPI(t, auth.Options{})
	idp := api.idp
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
	api := newAPI(t, auth.Options{})
	idp := api.idp
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
	api := newAPI(t, auth.Options{})
	for _, path := range []string{"/healthz", "/readyz"} {
		rec := httptest.NewRecorder()
		api.ServeHTTP(rec, httptest.NewRequestWithContext(t.Context(), http.MethodGet, path, nil))
		if rec.Code != http.StatusOK {
			t.Errorf("GET %s without a token = %d, want 200", path, rec.Code)
		}
	}
}
