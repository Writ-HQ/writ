package tenants

import (
	"errors"
	"regexp"
	"slices"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/Writ-HQ/writ/api/internal/auth"
)

// The whole permission table, written out. Changing who may do what means
// changing this test, on purpose.
func TestPermissionTable(t *testing.T) {
	want := map[Role]map[Permission]bool{
		RoleOwner:     {TenantRead: true, TenantUpdate: true},
		RoleAdmin:     {TenantRead: true, TenantUpdate: true},
		RoleStaff:     {TenantRead: true, TenantUpdate: false},
		RoleVolunteer: {TenantRead: true, TenantUpdate: false},
	}
	if len(rolePermissions) != len(want) {
		t.Errorf("the table has %d roles, want %d", len(rolePermissions), len(want))
	}
	for role, permissions := range want {
		for permission, allowed := range permissions {
			if got := role.Can(permission); got != allowed {
				t.Errorf("%s.Can(%s) = %v, want %v", role, permission, got, allowed)
			}
		}
	}

	// Anything unknown is denied.
	if Role("superuser").Can(TenantRead) || Role("").Can(TenantRead) {
		t.Error("an unknown role was granted a permission")
	}
	if RoleOwner.Can("tenant.delete") {
		t.Error("an unknown permission was granted")
	}
}

// The pattern the database enforces on tenants.slug.
var slugPattern = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`)

func TestSlugBase(t *testing.T) {
	tests := map[string]string{
		"Example Campaign":           "example-campaign",
		"Comité de Montréal":         "comite-de-montreal",
		"Association de Québec—Est":  "association-de-quebec-est",
		"  Riding   Association  ":   "riding-association",
		"Ward 7 / District 12":       "ward-7-district-12",
		"L'Assomption":               "l-assomption",
		"---":                        "tenant",
		"":                           "tenant",
		"日本語":                        "tenant",
		"Example (2026) Campaign!!!": "example-2026-campaign",
		strings.Repeat("a", 300):     strings.Repeat("a", slugBaseMax),
		strings.Repeat("ab ", 100):   strings.TrimSuffix(strings.Repeat("ab-", 18), "-"),
		"UPPER lower MiXeD":          "upper-lower-mixed",
		"trailing hyphen at the cut " + strings.Repeat("x", 27) + " yy": "trailing-hyphen-at-the-cut-" + strings.Repeat("x", 27),
	}
	for name, want := range tests {
		got := slugBase(name)
		if got != want {
			t.Errorf("slugBase(%q) = %q, want %q", name, got, want)
		}
		if len(got) > slugBaseMax || !slugPattern.MatchString(got) {
			t.Errorf("slugBase(%q) = %q is not a valid slug base", name, got)
		}
	}
}

func TestNewSlugIsValidAndDifferentEveryTime(t *testing.T) {
	seen := map[string]bool{}
	for _, name := range []string{"Example Campaign", "", strings.Repeat("long name ", 40), "Comité de Montréal"} {
		for range 200 {
			slug := newSlug(name)
			if !slugPattern.MatchString(slug) || len(slug) > slugMaxLen {
				t.Fatalf("newSlug(%q) = %q does not fit the database constraint", name, slug)
			}
			if !strings.HasPrefix(slug, slugBase(name)+"-") {
				t.Fatalf("newSlug(%q) = %q does not start with the name", name, slug)
			}
			if seen[slug] {
				t.Fatalf("newSlug(%q) repeated %q", name, slug)
			}
			seen[slug] = true
		}
	}
}

func TestCursorRoundTrip(t *testing.T) {
	id := uuid.Must(uuid.NewV7())
	got, err := decodeCursor(encodeCursor(id))
	if err != nil || got != id {
		t.Errorf("decodeCursor(encodeCursor(%s)) = %s, %v", id, got, err)
	}
	if got, err := decodeCursor(""); err != nil || got != uuid.Nil {
		t.Errorf("the empty cursor = %s, %v; want the zero UUID", got, err)
	}
	for _, bad := range []string{"not base64!", "c2hvcnQ", id.String(), encodeCursor(uuid.Nil), strings.Repeat("A", 200)} {
		if _, err := decodeCursor(bad); !errors.Is(err, ErrInvalidCursor) {
			t.Errorf("decodeCursor(%q) error = %v, want ErrInvalidCursor", bad, err)
		}
	}
}

func TestCanCreate(t *testing.T) {
	member, admin := auth.User{ID: uuid.New()}, auth.User{ID: uuid.New(), PlatformAdmin: true}

	restricted := NewService(nil, Options{})
	if restricted.CanCreate(member) || !restricted.CanCreate(admin) {
		t.Error("without self-service, only a platform admin may create a tenant")
	}
	open := NewService(nil, Options{SelfServe: true})
	if !open.CanCreate(member) || !open.CanCreate(admin) {
		t.Error("with self-service, anyone signed in may create a tenant")
	}
}

func TestValidation(t *testing.T) {
	var invalid *InvalidError

	for _, name := range []string{"", "   ", "\t\n"} {
		if _, err := validName(name); !errors.As(err, &invalid) || !invalid.Required || invalid.Field != "name" {
			t.Errorf("validName(%q) error = %v, want name required", name, err)
		}
	}
	if _, err := validName(strings.Repeat("é", 201)); !errors.As(err, &invalid) || invalid.Required {
		t.Errorf("a 201-character name: error = %v, want invalid", err)
	}
	// Characters, not bytes: 200 accented letters are 400 bytes.
	if got, err := validName("  " + strings.Repeat("é", 200) + "  "); err != nil || got != strings.Repeat("é", 200) {
		t.Errorf("a 200-character name was rejected or not trimmed: %v", err)
	}
	if _, err := validName("bad \xff bytes"); !errors.As(err, &invalid) {
		t.Errorf("invalid UTF-8: error = %v, want invalid", err)
	}

	for _, locale := range []string{"en", "fr"} {
		if err := validLocale(locale); err != nil {
			t.Errorf("validLocale(%q) = %v", locale, err)
		}
	}
	for _, locale := range []string{"", "EN", "fr-CA", "de"} {
		if err := validLocale(locale); !errors.As(err, &invalid) || invalid.Field != "default_locale" {
			t.Errorf("validLocale(%q) error = %v, want default_locale invalid", locale, err)
		}
	}
}

func TestOnlyASlugCollisionIsRetried(t *testing.T) {
	collision := &pgconn.PgError{Code: "23505", ConstraintName: "tenants_slug_key"}
	if !isSlugCollision(collision) || !isSlugCollision(errors.Join(errors.New("wrapped"), collision)) {
		t.Error("a slug collision was not recognised")
	}
	for name, err := range map[string]error{
		"another unique constraint": &pgconn.PgError{Code: "23505", ConstraintName: "memberships_tenant_id_user_id_key"},
		"a check violation":         &pgconn.PgError{Code: "23514", ConstraintName: "tenants_slug_key"},
		"not a database error":      errors.New("boom"),
		"nil":                       nil,
	} {
		if isSlugCollision(err) {
			t.Errorf("%s was treated as a slug collision", name)
		}
	}
}

func TestRolesMatchTheDatabaseAndTheContract(t *testing.T) {
	// memberships.role CHECK (role IN ('owner', 'admin', 'staff', 'volunteer'))
	want := []string{"admin", "owner", "staff", "volunteer"}
	var got []string
	for role := range rolePermissions {
		got = append(got, string(role))
	}
	slices.Sort(got)
	if !slices.Equal(got, want) {
		t.Errorf("roles = %v, want %v", got, want)
	}
}
