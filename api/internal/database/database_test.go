package database_test

import (
	"context"
	"errors"
	"fmt"
	"os"
	"slices"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/Writ-HQ/writ/api/internal/audit/auditdb"
	"github.com/Writ-HQ/writ/api/internal/auth/authdb"
	"github.com/Writ-HQ/writ/api/internal/database"
	"github.com/Writ-HQ/writ/api/internal/database/dbtest"
	"github.com/Writ-HQ/writ/api/internal/tenants/tenantsdb"
)

var db *dbtest.DB

func TestMain(m *testing.M) { os.Exit(dbtest.Run(m, &db)) }

// SQLSTATE 42501, insufficient_privilege: raised for a missing table
// privilege, for a row-level security violation and by the audit_log
// triggers.
const insufficientPrivilege = "42501"

func requireSQLState(t *testing.T, err error, want string) {
	t.Helper()
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		t.Fatalf("error = %v, want a PostgreSQL error with SQLSTATE %s", err, want)
	}
	if pgErr.Code != want {
		t.Fatalf("SQLSTATE = %s (%s), want %s", pgErr.Code, pgErr.Message, want)
	}
}

// fixture is two tenants, each with one member and one audit event. All of
// it is fictional.
type fixture struct {
	a, b tenantData
}

type tenantData struct {
	tenant     tenantsdb.Tenant
	user       authdb.User
	membership tenantsdb.Membership
	event      auditdb.AuditLog
}

func newFixture(t *testing.T) fixture {
	t.Helper()
	return fixture{a: seedTenant(t), b: seedTenant(t)}
}

func seedTenant(t *testing.T) tenantData {
	t.Helper()
	ctx := t.Context()

	var d tenantData
	d.user = provisionUser(t)
	// The caller chooses the tenant's id, so that the transaction can act
	// as that tenant while creating it.
	tenantID := uuid.Must(uuid.NewV7())
	err := database.WithTenant(ctx, db.App, tenantID, d.user.ID, func(tx pgx.Tx) error {
		var err error
		suffix := randomSuffix()
		d.tenant, err = tenantsdb.New(tx).CreateTenant(ctx, tenantsdb.CreateTenantParams{
			ID:            tenantID,
			Name:          "Example Campaign " + suffix,
			Slug:          "example-" + suffix,
			DefaultLocale: "en",
		})
		if err != nil {
			return err
		}
		d.membership, err = tenantsdb.New(tx).CreateMembership(ctx, tenantsdb.CreateMembershipParams{
			TenantID: d.tenant.ID,
			UserID:   d.user.ID,
			Role:     "staff",
			Status:   "active",
		})
		if err != nil {
			return err
		}
		d.event, err = auditdb.New(tx).InsertAuditEvent(ctx, auditEvent(d.tenant.ID, d.user.ID))
		return err
	})
	if err != nil {
		t.Fatalf("seeding tenant data: %v", err)
	}
	return d
}

func randomSuffix() string {
	return strings.ReplaceAll(uuid.NewString(), "-", "")[:12]
}

// provisionUser creates a fictional user the way a first login does.
func provisionUser(t *testing.T) authdb.User {
	t.Helper()
	suffix := randomSuffix()
	user, err := authdb.New(db.App).ProvisionUser(t.Context(), authdb.ProvisionUserParams{
		ExternalAuthID: "idp|" + suffix,
		Email:          suffix + "@example.test",
		DisplayName:    "Test Person " + suffix,
		Locale:         "fr",
	})
	if err != nil {
		t.Fatalf("provisioning user: %v", err)
	}
	return user
}

// addMembership adds a user to a tenant, acting as an existing member.
func addMembership(t *testing.T, d tenantData, userID uuid.UUID, status string) tenantsdb.Membership {
	t.Helper()
	var m tenantsdb.Membership
	err := database.WithTenant(t.Context(), db.App, d.tenant.ID, d.user.ID, func(tx pgx.Tx) error {
		var err error
		m, err = tenantsdb.New(tx).CreateMembership(t.Context(), tenantsdb.CreateMembershipParams{
			TenantID: d.tenant.ID, UserID: userID, Role: "staff", Status: status,
		})
		return err
	})
	if err != nil {
		t.Fatalf("adding membership: %v", err)
	}
	return m
}

func auditEvent(tenantID, actorID uuid.UUID) auditdb.InsertAuditEventParams {
	return auditdb.InsertAuditEventParams{
		TenantID:    tenantID,
		ActorUserID: uuid.NullUUID{UUID: actorID, Valid: true},
		Action:      "membership.created",
		EntityType:  "membership",
		Metadata:    []byte(`{}`),
	}
}

// inTenant acts for a tenant as a user who has no rows of their own, so
// that what the transaction sees is decided by the tenant alone.
func inTenant(t *testing.T, tenantID uuid.UUID, fn func(tx pgx.Tx) error) error {
	t.Helper()
	return database.WithTenant(t.Context(), db.App, tenantID, uuid.New(), fn)
}

func inUser(t *testing.T, userID uuid.UUID, fn func(tx pgx.Tx) error) error {
	t.Helper()
	return database.WithUser(t.Context(), db.App, userID, fn)
}

func inUserAndTenant(t *testing.T, tenantID, userID uuid.UUID, fn func(tx pgx.Tx) error) error {
	t.Helper()
	return database.WithTenant(t.Context(), db.App, tenantID, userID, fn)
}

// allTables is every application table. TestEveryTableEnforcesRLS fails if
// a table is added without being listed here.
var allTables = []string{"audit_log", "memberships", "tenants", "users"}

// visibleRows counts the rows each table shows to q.
func visibleRows(t *testing.T, q interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}) map[string]int {
	t.Helper()
	counts := map[string]int{}
	for _, table := range allTables {
		var n int
		// The table names are the constants above, not input.
		if err := q.QueryRow(t.Context(), "SELECT count(*) FROM "+pgx.Identifier{table}.Sanitize()).Scan(&n); err != nil {
			t.Fatalf("counting %s: %v", table, err)
		}
		counts[table] = n
	}
	return counts
}

func requireNoVisibleRows(t *testing.T, q interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}) {
	t.Helper()
	for table, n := range visibleRows(t, q) {
		if n != 0 {
			t.Errorf("%s shows %d rows, want none", table, n)
		}
	}
}

func TestRolesHaveNoSuperuserOrBypassRLS(t *testing.T) {
	for _, role := range []string{"writ_app", "writ_owner"} {
		var super, bypassRLS, createRole, createDB bool
		err := db.Superuser.QueryRow(t.Context(),
			"SELECT rolsuper, rolbypassrls, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname = $1", role,
		).Scan(&super, &bypassRLS, &createRole, &createDB)
		if err != nil {
			t.Fatalf("reading role %s: %v", role, err)
		}
		if super || bypassRLS || createRole || createDB {
			t.Errorf("%s: superuser=%v bypassrls=%v createrole=%v createdb=%v, want all false",
				role, super, bypassRLS, createRole, createDB)
		}
	}

	var current string
	if err := db.App.QueryRow(t.Context(), "SELECT current_user").Scan(&current); err != nil {
		t.Fatal(err)
	}
	if current != "writ_app" {
		t.Errorf("the application pool connects as %q, want writ_app", current)
	}
}

// Guards the rule for every future table as well: every table must have
// row-level security enabled, forced, and a policy.
func TestEveryTableEnforcesRLS(t *testing.T) {
	rows, err := db.Superuser.Query(t.Context(), `
		SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
		       (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid)
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
		  AND c.relname <> 'goose_db_version'
		ORDER BY c.relname`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()

	var seen []string
	for rows.Next() {
		var table string
		var enabled, forced bool
		var policies int
		if err := rows.Scan(&table, &enabled, &forced, &policies); err != nil {
			t.Fatal(err)
		}
		seen = append(seen, table)
		if !enabled || !forced || policies == 0 {
			t.Errorf("table %s: rls enabled=%v forced=%v policies=%d, want enabled, forced and at least one policy",
				table, enabled, forced, policies)
		}
	}
	if err := rows.Err(); err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(seen, allTables) {
		t.Errorf("tables = %v, want %v; add new tables to allTables", seen, allTables)
	}
}

func TestTenantCannotReadAnotherTenantsRows(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()

	err := inTenant(t, f.a.tenant.ID, func(tx pgx.Tx) error {
		memberships, err := tenantsdb.New(tx).ListMemberships(ctx)
		if err != nil {
			return err
		}
		if len(memberships) != 1 || memberships[0].ID != f.a.membership.ID {
			t.Errorf("tenant A lists %d memberships, want only its own", len(memberships))
		}

		events, err := auditdb.New(tx).ListAuditEvents(ctx, 100)
		if err != nil {
			return err
		}
		if len(events) != 1 || events[0].ID != f.a.event.ID {
			t.Errorf("tenant A lists %d audit events, want only its own", len(events))
		}

		// A direct lookup by tenant B's primary key finds nothing.
		if _, err := tenantsdb.New(tx).GetMembership(ctx, f.b.membership.ID); !errors.Is(err, pgx.ErrNoRows) {
			t.Errorf("tenant A reading tenant B's membership: err = %v, want pgx.ErrNoRows", err)
		}
		var n int
		if err := tx.QueryRow(ctx, "SELECT count(*) FROM audit_log WHERE id = $1", f.b.event.ID).Scan(&n); err != nil {
			return err
		}
		if n != 0 {
			t.Errorf("tenant A can see tenant B's audit event")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestTenantCannotWriteAnotherTenantsRows(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()

	t.Run("insert a membership into tenant B", func(t *testing.T) {
		err := inTenant(t, f.a.tenant.ID, func(tx pgx.Tx) error {
			_, err := tenantsdb.New(tx).CreateMembership(ctx, tenantsdb.CreateMembershipParams{
				TenantID: f.b.tenant.ID, UserID: f.a.user.ID, Role: "owner", Status: "active",
			})
			return err
		})
		requireSQLState(t, err, insufficientPrivilege)
	})

	t.Run("insert an audit event into tenant B", func(t *testing.T) {
		err := inTenant(t, f.a.tenant.ID, func(tx pgx.Tx) error {
			_, err := auditdb.New(tx).InsertAuditEvent(ctx, auditEvent(f.b.tenant.ID, f.a.user.ID))
			return err
		})
		requireSQLState(t, err, insufficientPrivilege)
	})

	t.Run("update or soft-delete tenant B's membership", func(t *testing.T) {
		err := inTenant(t, f.a.tenant.ID, func(tx pgx.Tx) error {
			q := tenantsdb.New(tx)
			n, err := q.UpdateMembershipRole(ctx, tenantsdb.UpdateMembershipRoleParams{ID: f.b.membership.ID, Role: "owner"})
			if err != nil {
				return err
			}
			if n != 0 {
				t.Errorf("tenant A changed the role on %d of tenant B's memberships", n)
			}
			n, err = q.SoftDeleteMembership(ctx, f.b.membership.ID)
			if err != nil {
				return err
			}
			if n != 0 {
				t.Errorf("tenant A soft-deleted %d of tenant B's memberships", n)
			}
			return nil
		})
		if err != nil {
			t.Fatal(err)
		}
	})

	t.Run("move own membership into tenant B", func(t *testing.T) {
		err := inTenant(t, f.a.tenant.ID, func(tx pgx.Tx) error {
			_, err := tx.Exec(ctx, "UPDATE memberships SET tenant_id = $1 WHERE id = $2", f.b.tenant.ID, f.a.membership.ID)
			return err
		})
		requireSQLState(t, err, insufficientPrivilege)
	})

	// Tenant B's data is exactly as it was seeded.
	err := inTenant(t, f.b.tenant.ID, func(tx pgx.Tx) error {
		memberships, err := tenantsdb.New(tx).ListMemberships(ctx)
		if err != nil {
			return err
		}
		if len(memberships) != 1 || memberships[0].Role != "staff" || memberships[0].DeletedAt != nil {
			t.Errorf("tenant B's memberships changed: %+v", memberships)
		}
		events, err := auditdb.New(tx).ListAuditEvents(ctx, 100)
		if err != nil {
			return err
		}
		if len(events) != 1 {
			t.Errorf("tenant B has %d audit events, want 1", len(events))
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestNoContextReturnsNothing(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()

	t.Run("with neither setting every table is empty", func(t *testing.T) {
		requireNoVisibleRows(t, db.App)
	})

	t.Run("an empty setting is no access, not an error", func(t *testing.T) {
		err := pgx.BeginFunc(ctx, db.App, func(tx pgx.Tx) error {
			if _, err := tx.Exec(ctx, "SELECT set_config('app.tenant_id', '', true), set_config('app.user_id', '', true)"); err != nil {
				return err
			}
			requireNoVisibleRows(t, tx)
			return nil
		})
		if err != nil {
			t.Fatal(err)
		}
	})

	t.Run("writes with neither setting are rejected", func(t *testing.T) {
		_, err := tenantsdb.New(db.App).CreateMembership(ctx, tenantsdb.CreateMembershipParams{
			TenantID: f.a.tenant.ID, UserID: f.b.user.ID, Role: "staff", Status: "active",
		})
		requireSQLState(t, err, insufficientPrivilege)

		_, err = auditdb.New(db.App).InsertAuditEvent(ctx, auditEvent(f.a.tenant.ID, f.a.user.ID))
		requireSQLState(t, err, insufficientPrivilege)

		_, err = tenantsdb.New(db.App).CreateTenant(ctx, tenantsdb.CreateTenantParams{
			ID: uuid.New(), Name: "Example Campaign", Slug: "example-" + randomSuffix(), DefaultLocale: "en",
		})
		requireSQLState(t, err, insufficientPrivilege)

		tag, err := db.App.Exec(ctx, "UPDATE tenants SET name = 'Changed' WHERE id = $1", f.a.tenant.ID)
		if err != nil {
			t.Fatal(err)
		}
		if tag.RowsAffected() != 0 {
			t.Errorf("renamed %d tenants with no context", tag.RowsAffected())
		}
		tag, err = db.App.Exec(ctx, "UPDATE users SET display_name = 'Changed' WHERE id = $1", f.a.user.ID)
		if err != nil {
			t.Fatal(err)
		}
		if tag.RowsAffected() != 0 {
			t.Errorf("changed %d users with no context", tag.RowsAffected())
		}
	})

	// The pooled-connection case: the same physical connection that just
	// served tenant A must not keep serving tenant A afterwards.
	t.Run("the context does not leak to the next user of a connection", func(t *testing.T) {
		conn, err := db.App.Acquire(ctx)
		if err != nil {
			t.Fatal(err)
		}
		defer conn.Release()

		err = database.WithTenant(ctx, conn, f.a.tenant.ID, f.a.user.ID, func(tx pgx.Tx) error {
			for table, n := range visibleRows(t, tx) {
				if n != 1 {
					t.Errorf("inside the helper %s shows %d rows, want 1", table, n)
				}
			}
			return nil
		})
		if err != nil {
			t.Fatal(err)
		}
		requireNoVisibleRows(t, conn)
	})

	t.Run("the owner role is subject to the policies too", func(t *testing.T) {
		requireNoVisibleRows(t, db.Owner)
	})
}

func TestUserSeesOnlyTheirOwnTenants(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()

	listTenants := func(t *testing.T, userID uuid.UUID) []uuid.UUID {
		t.Helper()
		var ids []uuid.UUID
		err := inUser(t, userID, func(tx pgx.Tx) error {
			tenants, err := tenantsdb.New(tx).ListTenantsForCurrentUser(ctx)
			for _, tenant := range tenants {
				ids = append(ids, tenant.ID)
			}
			if err != nil {
				return err
			}
			// The policy, not only the query, limits what is visible.
			if n := visibleRows(t, tx)["tenants"]; n != len(ids) {
				t.Errorf("tenants shows %d rows, the user's list has %d", n, len(ids))
			}
			return nil
		})
		if err != nil {
			t.Fatal(err)
		}
		return ids
	}

	t.Run("a user lists only the tenants they belong to", func(t *testing.T) {
		if got := listTenants(t, f.a.user.ID); !slices.Equal(got, []uuid.UUID{f.a.tenant.ID}) {
			t.Errorf("user A's tenants = %v, want only tenant A", got)
		}

		err := inUser(t, f.a.user.ID, func(tx pgx.Tx) error {
			if _, err := tenantsdb.New(tx).GetTenant(ctx, f.b.tenant.ID); !errors.Is(err, pgx.ErrNoRows) {
				t.Errorf("user A reading tenant B: err = %v, want pgx.ErrNoRows", err)
			}
			memberships, err := tenantsdb.New(tx).ListMemberships(ctx)
			if err != nil {
				return err
			}
			if len(memberships) != 1 || memberships[0].ID != f.a.membership.ID {
				t.Errorf("user A sees %d memberships, want only their own", len(memberships))
			}
			// Without a tenant there is no audit log to read.
			if n := visibleRows(t, tx)["audit_log"]; n != 0 {
				t.Errorf("user A sees %d audit events with no tenant set", n)
			}
			return nil
		})
		if err != nil {
			t.Fatal(err)
		}
	})

	t.Run("a second active membership adds the second tenant", func(t *testing.T) {
		user := provisionUser(t)
		addMembership(t, f.a, user.ID, "active")
		addMembership(t, f.b, user.ID, "active")
		got := listTenants(t, user.ID)
		if len(got) != 2 || !slices.Contains(got, f.a.tenant.ID) || !slices.Contains(got, f.b.tenant.ID) {
			t.Errorf("tenants = %v, want tenant A and tenant B", got)
		}
	})

	t.Run("an invitation or a removed membership does not reveal the tenant", func(t *testing.T) {
		invited := provisionUser(t)
		addMembership(t, f.a, invited.ID, "invited")
		if got := listTenants(t, invited.ID); len(got) != 0 {
			t.Errorf("an invited user sees tenants %v, want none", got)
		}

		removed := provisionUser(t)
		m := addMembership(t, f.a, removed.ID, "active")
		err := inUserAndTenant(t, f.a.tenant.ID, f.a.user.ID, func(tx pgx.Tx) error {
			_, err := tenantsdb.New(tx).SoftDeleteMembership(ctx, m.ID)
			return err
		})
		if err != nil {
			t.Fatal(err)
		}
		if got := listTenants(t, removed.ID); len(got) != 0 {
			t.Errorf("a removed user sees tenants %v, want none", got)
		}
	})

	t.Run("a user cannot change their own memberships", func(t *testing.T) {
		err := inUser(t, f.a.user.ID, func(tx pgx.Tx) error {
			n, err := tenantsdb.New(tx).UpdateMembershipRole(ctx, tenantsdb.UpdateMembershipRoleParams{ID: f.a.membership.ID, Role: "owner"})
			if err == nil && n != 0 {
				t.Errorf("a user changed their own role without a tenant context")
			}
			return err
		})
		if err != nil {
			requireSQLState(t, err, insufficientPrivilege)
		}

		err = inUser(t, f.a.user.ID, func(tx pgx.Tx) error {
			_, err := tenantsdb.New(tx).CreateMembership(ctx, tenantsdb.CreateMembershipParams{
				TenantID: f.b.tenant.ID, UserID: f.a.user.ID, Role: "owner", Status: "active",
			})
			return err
		})
		requireSQLState(t, err, insufficientPrivilege)
	})
}

func TestUserWithNoMembershipCannotSeeATenant(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()
	stranger := provisionUser(t)

	err := inUser(t, stranger.ID, func(tx pgx.Tx) error {
		var n int
		err := tx.QueryRow(ctx, "SELECT count(*) FROM tenants WHERE id = $1 OR slug = $2 OR name = $3",
			f.a.tenant.ID, f.a.tenant.Slug, f.a.tenant.Name).Scan(&n)
		if err != nil {
			return err
		}
		if n != 0 {
			t.Errorf("a user with no membership can see the tenant")
		}
		if n := visibleRows(t, tx)["tenants"]; n != 0 {
			t.Errorf("a user with no membership sees %d tenants", n)
		}

		rows, err := tenantsdb.New(tx).UpdateTenantName(ctx, tenantsdb.UpdateTenantNameParams{ID: f.a.tenant.ID, Name: "Changed"})
		if err != nil {
			return err
		}
		if rows != 0 {
			t.Errorf("a user with no membership renamed the tenant")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}

	t.Run("a member sees their tenant but renames it only as the current tenant", func(t *testing.T) {
		rename := func(tx pgx.Tx, id uuid.UUID) int64 {
			n, err := tenantsdb.New(tx).UpdateTenantName(ctx, tenantsdb.UpdateTenantNameParams{ID: id, Name: "Renamed Campaign"})
			if err != nil {
				t.Fatal(err)
			}
			return n
		}
		if err := inUser(t, f.a.user.ID, func(tx pgx.Tx) error {
			if n := rename(tx, f.a.tenant.ID); n != 0 {
				t.Errorf("a member renamed the tenant without it being the current tenant")
			}
			return nil
		}); err != nil {
			t.Fatal(err)
		}
		if err := inUserAndTenant(t, f.a.tenant.ID, f.a.user.ID, func(tx pgx.Tx) error {
			if n := rename(tx, f.b.tenant.ID); n != 0 {
				t.Errorf("tenant A renamed tenant B")
			}
			if n := rename(tx, f.a.tenant.ID); n != 1 {
				t.Errorf("tenant A renamed %d rows of itself, want 1", n)
			}
			return nil
		}); err != nil {
			t.Fatal(err)
		}
	})
}

func TestUserCannotReadAnotherUserUnlessTheyShareTheCurrentTenant(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()

	canRead := func(t *testing.T, tx pgx.Tx, id uuid.UUID) bool {
		t.Helper()
		_, err := authdb.New(tx).GetUser(ctx, id)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			t.Fatal(err)
		}
		return err == nil
	}

	t.Run("users in different tenants cannot read each other", func(t *testing.T) {
		if err := inUser(t, f.a.user.ID, func(tx pgx.Tx) error {
			if !canRead(t, tx, f.a.user.ID) {
				t.Error("user A cannot read their own row")
			}
			if canRead(t, tx, f.b.user.ID) {
				t.Error("user A can read user B with no tenant set")
			}
			return nil
		}); err != nil {
			t.Fatal(err)
		}
		if err := inUserAndTenant(t, f.a.tenant.ID, f.a.user.ID, func(tx pgx.Tx) error {
			if canRead(t, tx, f.b.user.ID) {
				t.Error("user A can read user B, who is not in tenant A")
			}
			if n := visibleRows(t, tx)["users"]; n != 1 {
				t.Errorf("tenant A shows %d users, want 1", n)
			}
			return nil
		}); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("sharing the current tenant makes the other user readable there only", func(t *testing.T) {
		shared := provisionUser(t)
		addMembership(t, f.a, shared.ID, "active")
		addMembership(t, f.b, shared.ID, "active")

		if err := inUserAndTenant(t, f.a.tenant.ID, f.a.user.ID, func(tx pgx.Tx) error {
			if !canRead(t, tx, shared.ID) {
				t.Error("user A cannot read a fellow member of tenant A")
			}
			return nil
		}); err != nil {
			t.Fatal(err)
		}
		// Without the tenant, sharing one is not enough.
		if err := inUser(t, f.a.user.ID, func(tx pgx.Tx) error {
			if canRead(t, tx, shared.ID) {
				t.Error("user A can read a fellow member with no tenant set")
			}
			return nil
		}); err != nil {
			t.Fatal(err)
		}
		// The shared user's other tenant does not bring user B into view
		// while tenant A is current.
		if err := inUserAndTenant(t, f.a.tenant.ID, shared.ID, func(tx pgx.Tx) error {
			if canRead(t, tx, f.b.user.ID) {
				t.Error("a member of A and B can read B's users while acting in tenant A")
			}
			return nil
		}); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("a user can update only their own profile", func(t *testing.T) {
		shared := provisionUser(t)
		addMembership(t, f.a, shared.ID, "active")

		err := inUserAndTenant(t, f.a.tenant.ID, f.a.user.ID, func(tx pgx.Tx) error {
			tag, err := tx.Exec(ctx, "UPDATE users SET display_name = 'Changed' WHERE id = $1", shared.ID)
			if err != nil {
				return err
			}
			if tag.RowsAffected() != 0 {
				t.Error("user A changed a fellow member's profile")
			}
			n, err := authdb.New(tx).UpdateCurrentUserProfile(ctx, authdb.UpdateCurrentUserProfileParams{DisplayName: "Renamed Person", Locale: "en"})
			if err != nil {
				return err
			}
			if n != 1 {
				t.Errorf("user A updated %d rows of their own profile, want 1", n)
			}
			return nil
		})
		if err != nil {
			t.Fatal(err)
		}

		err = inUser(t, f.a.user.ID, func(tx pgx.Tx) error {
			_, err := tx.Exec(ctx, "UPDATE users SET external_auth_id = 'idp|someone-else' WHERE id = $1", f.a.user.ID)
			return err
		})
		requireSQLState(t, err, insufficientPrivilege)

		err = inUser(t, f.a.user.ID, func(tx pgx.Tx) error {
			_, err := tx.Exec(ctx, "INSERT INTO users (external_auth_id, email) VALUES ('idp|direct', 'direct@example.test')")
			return err
		})
		requireSQLState(t, err, insufficientPrivilege)
	})
}

func TestCreateTenantWithFirstOwnerInOneTransaction(t *testing.T) {
	ctx := t.Context()
	user := provisionUser(t)
	tenantID := uuid.Must(uuid.NewV7())
	params := tenantsdb.CreateTenantParams{
		ID: tenantID, Name: "Example Riding Association", Slug: "example-" + randomSuffix(), DefaultLocale: "fr",
	}

	err := inUserAndTenant(t, tenantID, user.ID, func(tx pgx.Tx) error {
		tenant, err := tenantsdb.New(tx).CreateTenant(ctx, params)
		if err != nil {
			return fmt.Errorf("creating the tenant: %w", err)
		}
		membership, err := tenantsdb.New(tx).CreateMembership(ctx, tenantsdb.CreateMembershipParams{
			TenantID: tenant.ID, UserID: user.ID, Role: "owner", Status: "active",
		})
		if err != nil {
			return fmt.Errorf("creating the owner membership: %w", err)
		}
		event := auditEvent(tenant.ID, user.ID)
		event.Action, event.EntityType = "tenant.created", "tenant"
		event.EntityID = uuid.NullUUID{UUID: tenant.ID, Valid: true}
		if _, err := auditdb.New(tx).InsertAuditEvent(ctx, event); err != nil {
			return fmt.Errorf("recording the audit event: %w", err)
		}
		if membership.Role != "owner" {
			t.Errorf("role = %q, want owner", membership.Role)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}

	err = inUser(t, user.ID, func(tx pgx.Tx) error {
		tenants, err := tenantsdb.New(tx).ListTenantsForCurrentUser(ctx)
		if err != nil {
			return err
		}
		if len(tenants) != 1 || tenants[0].ID != tenantID {
			t.Errorf("the new owner lists %d tenants, want the one just created", len(tenants))
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}

	// Without the new id as the current tenant the row cannot be read
	// back, so the statement fails rather than half-working.
	t.Run("creating a tenant in a user-only context is rejected", func(t *testing.T) {
		err := inUser(t, user.ID, func(tx pgx.Tx) error {
			p := params
			p.ID, p.Slug = uuid.Must(uuid.NewV7()), "example-"+randomSuffix()
			_, err := tenantsdb.New(tx).CreateTenant(ctx, p)
			return err
		})
		requireSQLState(t, err, insufficientPrivilege)
	})
}

func TestProvisionUser(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()
	q := authdb.New(db.App)

	t.Run("finds the existing user and leaves it unchanged", func(t *testing.T) {
		again, err := q.ProvisionUser(ctx, authdb.ProvisionUserParams{
			ExternalAuthID: f.a.user.ExternalAuthID,
			Email:          "changed@example.test",
			DisplayName:    "Changed",
			Locale:         "en",
		})
		if err != nil {
			t.Fatal(err)
		}
		if again != f.a.user {
			t.Errorf("second call returned %+v, want the row from the first call", again.ID)
		}
	})

	t.Run("cannot be used to read arbitrary users", func(t *testing.T) {
		for name, id := range map[string]string{
			"empty":        "",
			"wildcard":     "%",
			"prefix":       "idp|%",
			"sql":          "' OR ''='",
			"other casing": strings.ToUpper(f.a.user.ExternalAuthID),
		} {
			got, err := q.ProvisionUser(ctx, authdb.ProvisionUserParams{
				ExternalAuthID: id, Email: randomSuffix() + "@example.test", Locale: "en",
			})
			if id == "" {
				if !errors.Is(err, pgx.ErrNoRows) {
					t.Errorf("%s: err = %v, want pgx.ErrNoRows", name, err)
				}
				continue
			}
			if err != nil {
				t.Fatalf("%s: %v", name, err)
			}
			// The identifier is matched exactly, so each of these is that
			// identifier's own user, never someone else's row.
			if got.ExternalAuthID != id || got.ID == f.a.user.ID || got.ID == f.b.user.ID {
				t.Errorf("%s: returned another user's row", name)
			}
		}
	})

	t.Run("calling it opens no access to the users table", func(t *testing.T) {
		err := pgx.BeginFunc(ctx, db.App, func(tx pgx.Tx) error {
			if _, err := authdb.New(tx).ProvisionUser(ctx, authdb.ProvisionUserParams{
				ExternalAuthID: f.a.user.ExternalAuthID, Email: "x@example.test", Locale: "en",
			}); err != nil {
				return err
			}
			if n := visibleRows(t, tx)["users"]; n != 0 {
				t.Errorf("after provisioning, the transaction sees %d users directly, want none", n)
			}
			// The setting the function uses means nothing to writ_app.
			if _, err := tx.Exec(ctx, "SELECT set_config('app.provisioning_external_auth_id', $1, true)", f.b.user.ExternalAuthID); err != nil {
				return err
			}
			if n := visibleRows(t, tx)["users"]; n != 0 {
				t.Errorf("writ_app sees %d users by setting the provisioning setting itself", n)
			}
			return nil
		})
		if err != nil {
			t.Fatal(err)
		}
	})

	t.Run("is locked down", func(t *testing.T) {
		var owner string
		var securityDefiner, appCanExecute, publicCanExecute bool
		var config []string
		err := db.Superuser.QueryRow(ctx, `
			SELECT pg_get_userbyid(p.proowner), p.prosecdef, p.proconfig,
			       has_function_privilege('writ_app', p.oid, 'EXECUTE'),
			       EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee = 0)
			FROM pg_proc p
			WHERE p.oid = 'public.provision_user(text, text, text, text)'::regprocedure`,
		).Scan(&owner, &securityDefiner, &config, &appCanExecute, &publicCanExecute)
		if err != nil {
			t.Fatal(err)
		}
		if owner != "writ_owner" || !securityDefiner || !appCanExecute || publicCanExecute {
			t.Errorf("owner=%s security definer=%v writ_app execute=%v public execute=%v",
				owner, securityDefiner, appCanExecute, publicCanExecute)
		}
		if !slices.Contains(config, "search_path=pg_catalog, pg_temp") {
			t.Errorf("function settings = %v, want a fixed search_path", config)
		}

		// It is the only SECURITY DEFINER function in the schema.
		var n int
		err = db.Superuser.QueryRow(ctx, `
			SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
			WHERE n.nspname = 'public' AND p.prosecdef`).Scan(&n)
		if err != nil {
			t.Fatal(err)
		}
		if n != 1 {
			t.Errorf("%d SECURITY DEFINER functions in public, want only provision_user", n)
		}
	})
}

func TestAuditLogIsAppendOnly(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()

	statements := map[string]string{
		"update": "UPDATE audit_log SET action = 'tampered' WHERE id = $1",
		"delete": "DELETE FROM audit_log WHERE id = $1",
	}
	for name, sql := range statements {
		t.Run("application role cannot "+name, func(t *testing.T) {
			err := inTenant(t, f.a.tenant.ID, func(tx pgx.Tx) error {
				_, err := tx.Exec(ctx, sql, f.a.event.ID)
				return err
			})
			requireSQLState(t, err, insufficientPrivilege)
		})

		// The owner has the table privilege, but no row-level security
		// policy permits the statement, so it matches no rows.
		t.Run("owner role cannot "+name, func(t *testing.T) {
			err := database.WithTenant(ctx, db.Owner, f.a.tenant.ID, f.a.user.ID, func(tx pgx.Tx) error {
				tag, err := tx.Exec(ctx, sql, f.a.event.ID)
				if err == nil && tag.RowsAffected() != 0 {
					t.Errorf("the owner role changed %d audit_log rows", tag.RowsAffected())
				}
				return err
			})
			if err != nil {
				requireSQLState(t, err, insufficientPrivilege)
			}
		})

		// A superuser bypasses privileges and row-level security; the
		// trigger still refuses.
		t.Run("superuser cannot "+name, func(t *testing.T) {
			_, err := db.Superuser.Exec(ctx, sql, f.a.event.ID)
			requireSQLState(t, err, insufficientPrivilege)
		})
	}

	t.Run("nobody can truncate", func(t *testing.T) {
		_, err := db.App.Exec(ctx, "TRUNCATE audit_log")
		requireSQLState(t, err, insufficientPrivilege)
		_, err = db.Superuser.Exec(ctx, "TRUNCATE audit_log")
		requireSQLState(t, err, insufficientPrivilege)
	})

	var action string
	err := db.Superuser.QueryRow(ctx, "SELECT action FROM audit_log WHERE id = $1", f.a.event.ID).Scan(&action)
	if err != nil {
		t.Fatalf("the audit event is gone: %v", err)
	}
	if action != "membership.created" {
		t.Errorf("the audit event was changed: action = %q", action)
	}
}

func TestApplicationRoleCannotHardDelete(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()

	err := inTenant(t, f.a.tenant.ID, func(tx pgx.Tx) error {
		_, err := tx.Exec(ctx, "DELETE FROM memberships WHERE id = $1", f.a.membership.ID)
		return err
	})
	requireSQLState(t, err, insufficientPrivilege)

	_, err = db.App.Exec(ctx, "DELETE FROM tenants WHERE id = $1", f.a.tenant.ID)
	requireSQLState(t, err, insufficientPrivilege)

	_, err = db.App.Exec(ctx, "DELETE FROM users WHERE id = $1", f.a.user.ID)
	requireSQLState(t, err, insufficientPrivilege)
}

func TestWithTenantAndWithUser(t *testing.T) {
	f := newFixture(t)
	ctx := t.Context()

	settings := func(tx pgx.Tx) (tenant, user string) {
		err := tx.QueryRow(ctx, "SELECT current_setting('app.tenant_id'), current_setting('app.user_id')").Scan(&tenant, &user)
		if err != nil {
			t.Fatal(err)
		}
		return tenant, user
	}

	t.Run("reject a zero ID without running fn", func(t *testing.T) {
		fn := func(pgx.Tx) error {
			t.Error("fn ran without a full context")
			return nil
		}
		if err := database.WithTenant(ctx, db.App, uuid.Nil, f.a.user.ID, fn); !errors.Is(err, database.ErrNoTenant) {
			t.Errorf("WithTenant with no tenant: err = %v, want ErrNoTenant", err)
		}
		if err := database.WithTenant(ctx, db.App, f.a.tenant.ID, uuid.Nil, fn); !errors.Is(err, database.ErrNoUser) {
			t.Errorf("WithTenant with no user: err = %v, want ErrNoUser", err)
		}
		if err := database.WithUser(ctx, db.App, uuid.Nil, fn); !errors.Is(err, database.ErrNoUser) {
			t.Errorf("WithUser with no user: err = %v, want ErrNoUser", err)
		}
	})

	t.Run("WithTenant sets both settings", func(t *testing.T) {
		err := inUserAndTenant(t, f.a.tenant.ID, f.a.user.ID, func(tx pgx.Tx) error {
			tenant, user := settings(tx)
			if tenant != f.a.tenant.ID.String() || user != f.a.user.ID.String() {
				t.Errorf("app.tenant_id = %q, app.user_id = %q", tenant, user)
			}
			return nil
		})
		if err != nil {
			t.Fatal(err)
		}
	})

	t.Run("WithUser sets the user and no tenant", func(t *testing.T) {
		err := inUser(t, f.a.user.ID, func(tx pgx.Tx) error {
			tenant, user := settings(tx)
			if tenant != "" || user != f.a.user.ID.String() {
				t.Errorf("app.tenant_id = %q, app.user_id = %q", tenant, user)
			}
			return nil
		})
		if err != nil {
			t.Fatal(err)
		}
	})

	t.Run("rolls back when fn returns an error", func(t *testing.T) {
		boom := errors.New("boom")
		err := inTenant(t, f.a.tenant.ID, func(tx pgx.Tx) error {
			if _, err := auditdb.New(tx).InsertAuditEvent(ctx, auditEvent(f.a.tenant.ID, f.a.user.ID)); err != nil {
				return err
			}
			return boom
		})
		if !errors.Is(err, boom) {
			t.Fatalf("err = %v, want boom", err)
		}
		if n := countAuditEvents(ctx, t, f.a.tenant.ID); n != 1 {
			t.Errorf("tenant A has %d audit events after a rollback, want 1", n)
		}
	})

	t.Run("commits when fn returns nil", func(t *testing.T) {
		err := inTenant(t, f.a.tenant.ID, func(tx pgx.Tx) error {
			_, err := auditdb.New(tx).InsertAuditEvent(ctx, auditEvent(f.a.tenant.ID, f.a.user.ID))
			return err
		})
		if err != nil {
			t.Fatal(err)
		}
		if n := countAuditEvents(ctx, t, f.a.tenant.ID); n != 2 {
			t.Errorf("tenant A has %d audit events after a commit, want 2", n)
		}
	})
}

func countAuditEvents(ctx context.Context, t *testing.T, tenantID uuid.UUID) int {
	t.Helper()
	var n int
	err := database.WithTenant(ctx, db.App, tenantID, uuid.New(), func(tx pgx.Tx) error {
		events, err := auditdb.New(tx).ListAuditEvents(ctx, 100)
		n = len(events)
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	return n
}

func TestOpenDoesNotLeakTheURL(t *testing.T) {
	_, err := database.Open(t.Context(), "postgres://writ_app:hunter2@localhost:5432/writ?pool_max_conns=many")
	if err == nil {
		t.Fatal("Open() error = nil, want an error for an invalid URL")
	}
	if strings.Contains(err.Error(), "hunter2") {
		t.Errorf("the error leaks the password: %v", err)
	}
}
