package e2e

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"regexp"
	"slices"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/Writ-HQ/writ/api/internal/apierror"
	"github.com/Writ-HQ/writ/api/internal/audit/auditdb"
	"github.com/Writ-HQ/writ/api/internal/auth"
	"github.com/Writ-HQ/writ/api/internal/auth/authtest"
	"github.com/Writ-HQ/writ/api/internal/database"
	"github.com/Writ-HQ/writ/api/internal/oapi"
	"github.com/Writ-HQ/writ/api/internal/tenants"
	"github.com/Writ-HQ/writ/api/internal/tenants/tenantsdb"
)

// person is a signed-in user of the API under test.
type person struct {
	id    uuid.UUID
	token string
}

// newPerson signs a new user in and provisions them.
func newPerson(t *testing.T, api *testAPI) person {
	t.Helper()
	token := api.idp.Sign(t, authtest.Token{Subject: newSubject()})
	return person{id: me(t, api, token).Id, token: token}
}

// newPlatformAdmin is a person an operator has made a platform admin, the
// way it is done until admin tooling exists.
func newPlatformAdmin(t *testing.T, api *testAPI) person {
	t.Helper()
	p := newPerson(t, api)
	err := database.WithUser(t.Context(), db.Owner, p.id, func(tx pgx.Tx) error {
		_, err := tx.Exec(t.Context(), "UPDATE users SET platform_admin = true WHERE id = $1", p.id)
		return err
	})
	if err != nil {
		t.Fatalf("granting platform admin: %v", err)
	}
	return p
}

// call makes a request as p. body is sent as JSON when not nil; a string
// is sent as it is, for malformed bodies.
func call(t *testing.T, api http.Handler, p person, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var reader *bytes.Reader
	switch b := body.(type) {
	case nil:
		reader = bytes.NewReader(nil)
	case string:
		reader = bytes.NewReader([]byte(b))
	default:
		encoded, err := json.Marshal(b)
		if err != nil {
			t.Fatal(err)
		}
		reader = bytes.NewReader(encoded)
	}
	req := httptest.NewRequestWithContext(t.Context(), method, path, reader)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if p.token != "" {
		req.Header.Set("Authorization", "Bearer "+p.token)
	}
	req.Header.Set("X-Request-ID", "req-tenants")
	rec := httptest.NewRecorder()
	api.ServeHTTP(rec, req)
	return rec
}

func requireStatus(t *testing.T, rec *httptest.ResponseRecorder, want int) {
	t.Helper()
	if rec.Code != want {
		t.Fatalf("status = %d (%s), want %d", rec.Code, rec.Body.String(), want)
	}
}

// requireError checks the status, the code, and that the body follows the
// Error schema and carries the request ID.
func requireError(t *testing.T, rec *httptest.ResponseRecorder, status int, code apierror.Code) oapi.Error {
	t.Helper()
	requireStatus(t, rec, status)
	body := decode[oapi.Error](t, rec)
	if body.Code != code || body.Message == "" || body.RequestId != "req-tenants" {
		t.Fatalf("body = %+v, want code %q, a message and the request ID", body, code)
	}
	return body
}

func createTenant(t *testing.T, api http.Handler, p person, name string) oapi.Tenant {
	t.Helper()
	rec := call(t, api, p, http.MethodPost, "/v1/tenants", map[string]any{"name": name})
	requireStatus(t, rec, http.StatusCreated)
	return decode[oapi.Tenant](t, rec)
}

// addMember gives p a membership of the tenant, written the way the next
// step's member management will write it: as an existing member, inside
// the tenant.
func addMember(t *testing.T, tenantID uuid.UUID, owner, p person, role, status string) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	err := database.WithTenant(t.Context(), db.App, tenantID, owner.id, func(tx pgx.Tx) error {
		m, err := tenantsdb.New(tx).CreateMembership(t.Context(), tenantsdb.CreateMembershipParams{
			TenantID: tenantID, UserID: p.id, Role: role, Status: status,
		})
		id = m.ID
		return err
	})
	if err != nil {
		t.Fatalf("adding a %s (%s) member: %v", role, status, err)
	}
	return id
}

// inTenantAs runs SQL inside the tenant as one of its members.
func inTenantAs(t *testing.T, tenantID uuid.UUID, p person, sql string, args ...any) {
	t.Helper()
	err := database.WithTenant(t.Context(), db.App, tenantID, p.id, func(tx pgx.Tx) error {
		tag, err := tx.Exec(t.Context(), sql, args...)
		if err == nil && tag.RowsAffected() != 1 {
			return fmt.Errorf("%d rows affected, want 1", tag.RowsAffected())
		}
		return err
	})
	if err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
}

// auditActions returns the tenant's audit events, oldest first, as
// "action" or "action fields".
func auditActions(t *testing.T, tenantID uuid.UUID, p person) []string {
	t.Helper()
	var out []string
	err := database.WithTenant(t.Context(), db.App, tenantID, p.id, func(tx pgx.Tx) error {
		events, err := auditdb.New(tx).ListAuditEvents(t.Context(), 100)
		for _, e := range events {
			if e.TenantID != tenantID || e.EntityType != "tenant" || e.EntityID.UUID != tenantID {
				t.Errorf("unexpected audit event %+v", e)
			}
			entry := e.Action + " by " + e.ActorUserID.UUID.String()
			if string(e.Metadata) != "{}" {
				entry += " " + string(e.Metadata)
			}
			out = append(out, entry)
		}
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	slices.Reverse(out)
	return out
}

var generatedSlug = regexp.MustCompile(`^[a-z0-9-]+-[bcdfghjkmnpqrstvwxz2-9]{8}$`)

func TestTenantCreationIsRestrictedToPlatformAdmins(t *testing.T) {
	api := newAPI(t, auth.Options{})
	admin, member := newPlatformAdmin(t, api), newPerson(t, api)

	t.Run("GET /v1/me says who is a platform admin", func(t *testing.T) {
		if !me(t, api, admin.token).PlatformAdmin || me(t, api, member.token).PlatformAdmin {
			t.Error("platform_admin on /v1/me does not match the users")
		}
	})

	t.Run("anyone else gets 403, whatever they send", func(t *testing.T) {
		for _, body := range []any{
			map[string]any{"name": "Example Campaign"},
			map[string]any{"name": ""},
			map[string]any{},
		} {
			rec := call(t, api, member, http.MethodPost, "/v1/tenants", body)
			requireError(t, rec, http.StatusForbidden, apierror.PermissionDenied)
		}
		if rec := call(t, api, member, http.MethodGet, "/v1/tenants", nil); len(decode[oapi.TenantList](t, rec).Data) != 0 {
			t.Error("a refused create left a tenant behind")
		}
	})

	t.Run("a platform admin creates a tenant and owns it", func(t *testing.T) {
		rec := call(t, api, admin, http.MethodPost, "/v1/tenants", map[string]any{"name": "  Comité de Montréal  ", "default_locale": "fr"})
		requireStatus(t, rec, http.StatusCreated)
		raw := rec.Body.String()
		tenant := decode[oapi.Tenant](t, rec)

		if tenant.Name != "Comité de Montréal" || tenant.DefaultLocale != "fr" || tenant.Role != "owner" {
			t.Errorf("tenant = %+v, want the trimmed name, fr, and role owner", tenant)
		}
		if !generatedSlug.MatchString(tenant.Slug) || !strings.HasPrefix(tenant.Slug, "comite-de-montreal-") {
			t.Errorf("slug = %q, want comite-de-montreal- and a random suffix", tenant.Slug)
		}
		if tenant.CreatedAt.IsZero() || !tenant.CreatedAt.Equal(tenant.UpdatedAt) {
			t.Errorf("timestamps = %v, %v", tenant.CreatedAt, tenant.UpdatedAt)
		}
		// RFC 3339 in UTC, as the contract says, whatever zone the server is in.
		if !regexp.MustCompile(`"created_at":"[0-9T:.-]+Z"`).MatchString(raw) {
			t.Errorf("created_at is not in UTC: %s", raw)
		}

		// The tenant, its owner and the audit event were written together.
		got := decode[oapi.Tenant](t, call(t, api, admin, http.MethodGet, "/v1/tenants/"+tenant.Id.String(), nil))
		if got != tenant {
			t.Errorf("GET returned %+v, want %+v", got, tenant)
		}
		if actions := auditActions(t, tenant.Id, admin); !slices.Equal(actions, []string{"tenant.created by " + admin.id.String()}) {
			t.Errorf("audit log = %v, want one tenant.created by the creator", actions)
		}
	})

	t.Run("the default language is English", func(t *testing.T) {
		if tenant := createTenant(t, api, admin, "Example Campaign"); tenant.DefaultLocale != "en" {
			t.Errorf("default_locale = %q, want en", tenant.DefaultLocale)
		}
	})

	t.Run("with self-service on, anyone signed in may create one", func(t *testing.T) {
		open := newAPIWith(t, auth.Options{}, tenants.Options{SelfServe: true})
		anyone := newPerson(t, open)
		if tenant := createTenant(t, open, anyone, "Example Advocacy Group"); tenant.Role != "owner" {
			t.Errorf("role = %q, want owner", tenant.Role)
		}
	})
}

func TestTenantCreationValidates(t *testing.T) {
	api := newAPI(t, auth.Options{})
	admin := newPlatformAdmin(t, api)

	tests := []struct {
		name      string
		body      any
		field     string
		wantCode  apierror.DetailCode
		wantState int
	}{
		{"no name", map[string]any{}, "name", apierror.DetailRequired, http.StatusUnprocessableEntity},
		{"a blank name", map[string]any{"name": "   "}, "name", apierror.DetailRequired, http.StatusUnprocessableEntity},
		{"a name that is too long", map[string]any{"name": strings.Repeat("x", 201)}, "name", apierror.DetailInvalid, http.StatusUnprocessableEntity},
		{"an unsupported language", map[string]any{"name": "Example Campaign", "default_locale": "de"}, "default_locale", apierror.DetailInvalid, http.StatusUnprocessableEntity},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := call(t, api, admin, http.MethodPost, "/v1/tenants", tt.body)
			body := requireError(t, rec, tt.wantState, apierror.ValidationFailed)
			if body.Details == nil || len(*body.Details) != 1 || *(*body.Details)[0].Field != tt.field || (*body.Details)[0].Code != tt.wantCode {
				t.Errorf("details = %s, want %s %s", rec.Body.String(), tt.field, tt.wantCode)
			}
		})
	}

	t.Run("a body that is not JSON is a bad request", func(t *testing.T) {
		rec := call(t, api, admin, http.MethodPost, "/v1/tenants", `{"name": `)
		requireError(t, rec, http.StatusBadRequest, apierror.BadRequest)
	})

	if rec := call(t, api, admin, http.MethodGet, "/v1/tenants", nil); len(decode[oapi.TenantList](t, rec).Data) != 0 {
		t.Error("an invalid create left a tenant behind")
	}
}

func TestCreatingATenantNeverRevealsAnother(t *testing.T) {
	t.Run("two tenants may have the same name", func(t *testing.T) {
		api := newAPI(t, auth.Options{})
		one, two := newPlatformAdmin(t, api), newPlatformAdmin(t, api)

		a := createTenant(t, api, one, "Example Campaign")
		b := createTenant(t, api, two, "Example Campaign")
		if a.Slug == b.Slug || a.Id == b.Id {
			t.Errorf("slugs %q and %q, ids %s and %s: want different", a.Slug, b.Slug, a.Id, b.Id)
		}
		// Neither can reach the other's.
		requireError(t, call(t, api, one, http.MethodGet, "/v1/tenants/"+b.Id.String(), nil), http.StatusNotFound, apierror.NotFound)
	})

	t.Run("a slug that is already taken is retried, not reported", func(t *testing.T) {
		calls := 0
		taken := "example-campaign-" + strings.ReplaceAll(uuid.NewString(), "-", "")[:8]
		api := newAPIWith(t, auth.Options{}, tenants.Options{
			// The first tenant takes the slug; the second is offered it
			// twice more before getting a free one.
			NewSlug: func(string) string {
				calls++
				if calls <= 3 {
					return taken
				}
				return taken + "x"
			},
		})
		one, two := newPlatformAdmin(t, api), newPlatformAdmin(t, api)

		first := createTenant(t, api, one, "Example Campaign")
		second := createTenant(t, api, two, "Example Campaign")
		if first.Slug != taken || second.Slug != taken+"x" || calls != 4 {
			t.Errorf("slugs %q and %q after %d attempts", first.Slug, second.Slug, calls)
		}
		// The failed attempts left nothing behind: the second user has
		// exactly one tenant, with one owner and one audit event.
		list := decode[oapi.TenantList](t, call(t, api, two, http.MethodGet, "/v1/tenants", nil))
		if len(list.Data) != 1 || list.Data[0].Id != second.Id {
			t.Errorf("the second user has %d tenants, want 1", len(list.Data))
		}
		if actions := auditActions(t, second.Id, two); len(actions) != 1 {
			t.Errorf("audit log = %v, want one event", actions)
		}
	})
}

func TestListTenants(t *testing.T) {
	api := newAPI(t, auth.Options{})
	admin, other := newPlatformAdmin(t, api), newPlatformAdmin(t, api)
	user := newPerson(t, api)

	// Five tenants the user is an active member of, in creation order,
	// with different roles.
	roles := []string{"owner", "admin", "staff", "volunteer", "staff"}
	var mine []oapi.Tenant
	for i, role := range roles {
		tenant := createTenant(t, api, admin, fmt.Sprintf("Example Campaign %d", i))
		addMember(t, tenant.Id, admin, user, role, "active")
		tenant.Role = oapi.Role(role)
		mine = append(mine, tenant)
	}
	// And tenants that must not appear: one they were never in, and one
	// each where the membership is invited, suspended or removed, and one
	// that has been deleted.
	createTenant(t, api, other, "Someone Else's Campaign")
	invited := createTenant(t, api, admin, "Invited")
	addMember(t, invited.Id, admin, user, "staff", "invited")
	suspended := createTenant(t, api, admin, "Suspended")
	addMember(t, suspended.Id, admin, user, "staff", "suspended")
	removed := createTenant(t, api, admin, "Removed")
	removedID := addMember(t, removed.Id, admin, user, "staff", "active")
	inTenantAs(t, removed.Id, admin, "UPDATE memberships SET deleted_at = now() WHERE id = $1", removedID)
	deleted := createTenant(t, api, admin, "Deleted")
	addMember(t, deleted.Id, admin, user, "owner", "active")
	inTenantAs(t, deleted.Id, admin, "UPDATE tenants SET deleted_at = now() WHERE id = $1", deleted.Id)

	list := func(t *testing.T, query string) oapi.TenantList {
		t.Helper()
		rec := call(t, api, user, http.MethodGet, "/v1/tenants"+query, nil)
		requireStatus(t, rec, http.StatusOK)
		return decode[oapi.TenantList](t, rec)
	}

	t.Run("only active memberships of live tenants, oldest first, with the caller's role", func(t *testing.T) {
		got := list(t, "")
		if !slices.Equal(got.Data, mine) {
			t.Errorf("list = %+v\nwant  %+v", got.Data, mine)
		}
		if got.Page.NextCursor != nil {
			t.Errorf("next_cursor = %q on the only page, want null", *got.Page.NextCursor)
		}
		if !strings.Contains(call(t, api, user, http.MethodGet, "/v1/tenants", nil).Body.String(), `"next_cursor":null`) {
			t.Error("the last page does not carry an explicit null next_cursor")
		}
	})

	t.Run("pages follow the cursor without gaps or repeats", func(t *testing.T) {
		var seen []oapi.Tenant
		query, pages := "?limit=2", 0
		for {
			page := list(t, query)
			pages++
			seen = append(seen, page.Data...)
			if page.Page.NextCursor == nil {
				break
			}
			if len(page.Data) != 2 {
				t.Fatalf("a page before the last has %d items, want 2", len(page.Data))
			}
			query = "?limit=2&cursor=" + *page.Page.NextCursor
		}
		if pages != 3 || !slices.Equal(seen, mine) {
			t.Errorf("%d pages gave %d tenants, want 3 pages and all 5 in order", pages, len(seen))
		}
	})

	t.Run("a page that ends exactly at the last item has no next cursor", func(t *testing.T) {
		if page := list(t, "?limit=5"); len(page.Data) != 5 || page.Page.NextCursor != nil {
			t.Errorf("limit=5: %d items, next_cursor = %v", len(page.Data), page.Page.NextCursor)
		}
	})

	t.Run("a cursor cannot reach tenants that are not the caller's", func(t *testing.T) {
		// A cursor from before every tenant in the database.
		page := list(t, "?cursor=AAAAAAAAAAAAAAAAAAAAAQ&limit=100")
		if !slices.Equal(page.Data, mine) {
			t.Errorf("a forged cursor returned %d tenants, want the caller's own 5", len(page.Data))
		}
	})

	t.Run("bad parameters", func(t *testing.T) {
		rec := call(t, api, user, http.MethodGet, "/v1/tenants?cursor=not-a-cursor", nil)
		requireError(t, rec, http.StatusBadRequest, apierror.InvalidCursor)
		for _, query := range []string{"?limit=0", "?limit=101", "?limit=-1", "?limit=abc"} {
			rec := call(t, api, user, http.MethodGet, "/v1/tenants"+query, nil)
			requireError(t, rec, http.StatusBadRequest, apierror.BadRequest)
		}
	})

	t.Run("someone with no memberships gets an empty list, not an error", func(t *testing.T) {
		rec := call(t, api, newPerson(t, api), http.MethodGet, "/v1/tenants", nil)
		requireStatus(t, rec, http.StatusOK)
		if !strings.Contains(rec.Body.String(), `"data":[]`) {
			t.Errorf("body = %s, want an empty array", rec.Body.String())
		}
	})
}

// The rule the whole product rests on: a tenant you cannot act in does not
// exist as far as you can tell.
func TestTenantIs404UnlessTheCallerIsAnActiveMember(t *testing.T) {
	api := newAPI(t, auth.Options{})
	owner := newPlatformAdmin(t, api)
	tenant := createTenant(t, api, owner, "Example Campaign")
	path := "/v1/tenants/" + tenant.Id.String()

	// What "not found" looks like, from a tenant ID nobody has.
	reference := call(t, api, owner, http.MethodGet, "/v1/tenants/"+uuid.NewString(), nil)
	requireError(t, reference, http.StatusNotFound, apierror.NotFound)

	stranger := newPerson(t, api)
	otherAdmin := newPlatformAdmin(t, api)
	invited := newPerson(t, api)
	addMember(t, tenant.Id, owner, invited, "admin", "invited")
	suspended := newPerson(t, api)
	addMember(t, tenant.Id, owner, suspended, "owner", "suspended")
	removed := newPerson(t, api)
	removedID := addMember(t, tenant.Id, owner, removed, "owner", "active")
	requireStatus(t, call(t, api, removed, http.MethodGet, path, nil), http.StatusOK)
	inTenantAs(t, tenant.Id, owner, "UPDATE memberships SET deleted_at = now() WHERE id = $1", removedID)

	cases := []struct {
		name string
		who  person
		path string
	}{
		{"someone who was never a member", stranger, path},
		// The flag grants tenant creation, not access.
		{"a platform admin who is not a member", otherAdmin, path},
		{"an invited member who has not accepted", invited, path},
		{"a suspended member, even a suspended owner", suspended, path},
		{"a removed member", removed, path},
		{"a tenant ID that is not a UUID", owner, "/v1/tenants/not-a-uuid"},
		{"a tenant ID that is nearly a UUID", owner, path + "0"},
		{"the nil UUID", owner, "/v1/tenants/00000000-0000-0000-0000-000000000000"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			for _, method := range []string{http.MethodGet, http.MethodPatch} {
				var body any
				if method == http.MethodPatch {
					body = map[string]any{"name": "Taken Over"}
				}
				rec := call(t, api, tc.who, method, tc.path, body)
				requireError(t, rec, http.StatusNotFound, apierror.NotFound)
				// Byte for byte the same as a tenant that does not exist.
				if rec.Body.String() != reference.Body.String() {
					t.Errorf("%s: body = %s, want exactly %s", method, rec.Body.String(), reference.Body.String())
				}
			}
		})
	}

	t.Run("a soft-deleted tenant, even for its owner", func(t *testing.T) {
		doomed := createTenant(t, api, owner, "Doomed Campaign")
		doomedPath := "/v1/tenants/" + doomed.Id.String()
		requireStatus(t, call(t, api, owner, http.MethodGet, doomedPath, nil), http.StatusOK)

		inTenantAs(t, doomed.Id, owner, "UPDATE tenants SET deleted_at = now() WHERE id = $1", doomed.Id)

		for _, method := range []string{http.MethodGet, http.MethodPatch} {
			rec := call(t, api, owner, method, doomedPath, map[string]any{"name": "Revived"})
			requireError(t, rec, http.StatusNotFound, apierror.NotFound)
			if rec.Body.String() != reference.Body.String() {
				t.Errorf("%s: body = %s, want exactly %s", method, rec.Body.String(), reference.Body.String())
			}
		}
	})

	t.Run("none of that changed the tenant", func(t *testing.T) {
		got := decode[oapi.Tenant](t, call(t, api, owner, http.MethodGet, path, nil))
		if got != tenant {
			t.Errorf("tenant = %+v, want it untouched: %+v", got, tenant)
		}
		if actions := auditActions(t, tenant.Id, owner); len(actions) != 1 {
			t.Errorf("audit log = %v, want only the creation", actions)
		}
	})

	t.Run("without a token it is 401 before anything else", func(t *testing.T) {
		for _, p := range []string{path, "/v1/tenants/not-a-uuid", "/v1/tenants"} {
			requireStatus(t, call(t, api, person{}, http.MethodGet, p, nil), http.StatusUnauthorized)
		}
	})
}

func TestUpdateTenantByRole(t *testing.T) {
	api := newAPI(t, auth.Options{})
	owner := newPlatformAdmin(t, api)
	tenant := createTenant(t, api, owner, "Example Campaign")
	path := "/v1/tenants/" + tenant.Id.String()

	members := map[string]person{"owner": owner}
	for _, role := range []string{"admin", "staff", "volunteer"} {
		members[role] = newPerson(t, api)
		addMember(t, tenant.Id, owner, members[role], role, "active")
	}

	t.Run("every member can read, and sees their own role", func(t *testing.T) {
		for role, p := range members {
			got := decode[oapi.Tenant](t, call(t, api, p, http.MethodGet, path, nil))
			if got.Id != tenant.Id || string(got.Role) != role {
				t.Errorf("%s reads role %q", role, got.Role)
			}
		}
	})

	t.Run("staff and volunteers cannot update: 403, because they are members", func(t *testing.T) {
		for _, role := range []string{"staff", "volunteer"} {
			for _, body := range []any{map[string]any{"name": "Renamed"}, map[string]any{}, map[string]any{"default_locale": "de"}} {
				rec := call(t, api, members[role], http.MethodPatch, path, body)
				requireError(t, rec, http.StatusForbidden, apierror.PermissionDenied)
			}
		}
	})

	t.Run("owners and admins can", func(t *testing.T) {
		rec := call(t, api, members["admin"], http.MethodPatch, path, map[string]any{"name": "  Renamed Campaign "})
		requireStatus(t, rec, http.StatusOK)
		renamed := decode[oapi.Tenant](t, rec)
		if renamed.Name != "Renamed Campaign" || renamed.DefaultLocale != "en" || renamed.Role != "admin" {
			t.Errorf("after an admin's rename: %+v", renamed)
		}
		// The slug is an identifier and stays put.
		if renamed.Slug != tenant.Slug || renamed.Id != tenant.Id {
			t.Errorf("slug %q, id %s changed with the name", renamed.Slug, renamed.Id)
		}
		if !renamed.UpdatedAt.After(tenant.UpdatedAt) || !renamed.CreatedAt.Equal(tenant.CreatedAt) {
			t.Errorf("timestamps: created %v, updated %v", renamed.CreatedAt, renamed.UpdatedAt)
		}

		rec = call(t, api, owner, http.MethodPatch, path, map[string]any{"default_locale": "fr"})
		requireStatus(t, rec, http.StatusOK)
		if got := decode[oapi.Tenant](t, rec); got.DefaultLocale != "fr" || got.Name != "Renamed Campaign" || got.Role != "owner" {
			t.Errorf("after an owner's change of language: %+v", got)
		}

		rec = call(t, api, owner, http.MethodPatch, path, map[string]any{"name": "Both", "default_locale": "en"})
		requireStatus(t, rec, http.StatusOK)
	})

	t.Run("each change is audited with who and which fields, not the values", func(t *testing.T) {
		want := []string{
			"tenant.created by " + owner.id.String(),
			"tenant.updated by " + members["admin"].id.String() + ` {"fields": ["name"]}`,
			"tenant.updated by " + owner.id.String() + ` {"fields": ["default_locale"]}`,
			"tenant.updated by " + owner.id.String() + ` {"fields": ["name", "default_locale"]}`,
		}
		got := auditActions(t, tenant.Id, owner)
		if !slices.Equal(got, want) {
			t.Errorf("audit log =\n%s\nwant\n%s", strings.Join(got, "\n"), strings.Join(want, "\n"))
		}
		if strings.Contains(strings.Join(got, " "), "Renamed") {
			t.Error("the audit log contains the new name")
		}
	})

	t.Run("invalid changes are refused and change nothing", func(t *testing.T) {
		before := decode[oapi.Tenant](t, call(t, api, owner, http.MethodGet, path, nil))
		for name, body := range map[string]any{
			"nothing to change":       map[string]any{},
			"a blank name":            map[string]any{"name": "  "},
			"a name that is too long": map[string]any{"name": strings.Repeat("x", 201)},
			"an unsupported language": map[string]any{"default_locale": "de"},
			"one good field, one bad": map[string]any{"name": "Good Name", "default_locale": "de"},
		} {
			rec := call(t, api, owner, http.MethodPatch, path, body)
			if body := requireError(t, rec, http.StatusUnprocessableEntity, apierror.ValidationFailed); body.Details == nil {
				t.Errorf("%s: no details in %s", name, rec.Body.String())
			}
		}
		if after := decode[oapi.Tenant](t, call(t, api, owner, http.MethodGet, path, nil)); after != before {
			t.Errorf("an invalid update changed the tenant: %+v", after)
		}
		if n := len(auditActions(t, tenant.Id, owner)); n != 4 {
			t.Errorf("%d audit events after refused updates, want still 4", n)
		}
	})

	t.Run("a fresh membership check on every request", func(t *testing.T) {
		admin := members["admin"]
		inTenantAs(t, tenant.Id, owner, "UPDATE memberships SET role = 'staff' WHERE user_id = $1", admin.id)
		requireError(t, call(t, api, admin, http.MethodPatch, path, map[string]any{"name": "Again"}), http.StatusForbidden, apierror.PermissionDenied)

		inTenantAs(t, tenant.Id, owner, "UPDATE memberships SET status = 'suspended' WHERE user_id = $1", admin.id)
		requireError(t, call(t, api, admin, http.MethodGet, path, nil), http.StatusNotFound, apierror.NotFound)
	})
}

func TestTenantsAreIsolatedFromEachOther(t *testing.T) {
	api := newAPI(t, auth.Options{})
	ownerA, ownerB := newPlatformAdmin(t, api), newPlatformAdmin(t, api)
	a := createTenant(t, api, ownerA, "Campaign A")
	b := createTenant(t, api, ownerB, "Campaign B")

	// An owner of A is nobody in B.
	for _, method := range []string{http.MethodGet, http.MethodPatch} {
		rec := call(t, api, ownerA, method, "/v1/tenants/"+b.Id.String(), map[string]any{"name": "Taken Over"})
		requireError(t, rec, http.StatusNotFound, apierror.NotFound)
	}
	if list := decode[oapi.TenantList](t, call(t, api, ownerA, http.MethodGet, "/v1/tenants", nil)); len(list.Data) != 1 || list.Data[0].Id != a.Id {
		t.Errorf("owner A lists %d tenants, want only A", len(list.Data))
	}

	if got := decode[oapi.Tenant](t, call(t, api, ownerB, http.MethodGet, "/v1/tenants/"+b.Id.String(), nil)); got != b {
		t.Errorf("tenant B = %+v, want it untouched", got)
	}
	if actions := auditActions(t, b.Id, ownerB); len(actions) != 1 {
		t.Errorf("tenant B's audit log = %v, want only its creation", actions)
	}

	// Someone in both acts in each separately, with the role they hold there.
	both := newPerson(t, api)
	addMember(t, a.Id, ownerA, both, "admin", "active")
	addMember(t, b.Id, ownerB, both, "volunteer", "active")
	requireStatus(t, call(t, api, both, http.MethodPatch, "/v1/tenants/"+a.Id.String(), map[string]any{"name": "Campaign A Renamed"}), http.StatusOK)
	requireError(t, call(t, api, both, http.MethodPatch, "/v1/tenants/"+b.Id.String(), map[string]any{"name": "Campaign B Renamed"}), http.StatusForbidden, apierror.PermissionDenied)
	if got := decode[oapi.Tenant](t, call(t, api, ownerB, http.MethodGet, "/v1/tenants/"+b.Id.String(), nil)); got.Name != "Campaign B" {
		t.Errorf("tenant B was renamed to %q by a volunteer", got.Name)
	}
}
