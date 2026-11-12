// Package database opens the connection pool and provides the transaction
// helpers, WithUser and WithTenant, that every query must run through.
package database

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Returned by WithTenant and WithUser when given the zero UUID. fn is not
// run.
var (
	ErrNoTenant = errors.New("database: tenant ID is required")
	ErrNoUser   = errors.New("database: user ID is required")
)

// Open returns a connection pool for the given URL. It does not connect
// eagerly, so the caller can start while the database is still coming up;
// use Ping to check connectivity. Errors never include the URL, which
// contains the password.
func Open(ctx context.Context, url string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		// The parse error can quote the URL, so it is not wrapped.
		return nil, errors.New("database: the connection URL is not valid")
	}
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("database: creating the pool: %w", err)
	}
	return pool, nil
}

// Beginner starts a transaction. *pgxpool.Pool, *pgxpool.Conn and *pgx.Conn
// all implement it.
type Beginner interface {
	Begin(ctx context.Context) (pgx.Tx, error)
}

// WithUser runs fn inside a transaction that acts for a signed-in user who
// has not chosen a tenant yet: listing the tenants they belong to, reading
// or updating their own profile, accepting an invitation.
//
// It sets app.user_id only. Row-level security then shows the user their
// own row in users, their own memberships, and the tenants they are an
// active member of. Everything else appears empty.
func WithUser(ctx context.Context, db Beginner, userID uuid.UUID, fn func(tx pgx.Tx) error) error {
	if userID == uuid.Nil {
		return ErrNoUser
	}
	return inTx(ctx, db, uuid.Nil, userID, fn)
}

// WithTenant runs fn inside a transaction that acts for a user within one
// tenant. It sets both app.tenant_id and app.user_id, which the row-level
// security policies compare rows to.
//
// The caller must already have checked that the user is a member of the
// tenant; the database does not check it again. To create a tenant, pass
// the id chosen for the new tenant.
//
// All access to tenant-scoped tables must go through this function.
// Outside it, row-level security makes those tables appear empty and
// rejects writes.
func WithTenant(ctx context.Context, db Beginner, tenantID, userID uuid.UUID, fn func(tx pgx.Tx) error) error {
	if tenantID == uuid.Nil {
		return ErrNoTenant
	}
	if userID == uuid.Nil {
		return ErrNoUser
	}
	return inTx(ctx, db, tenantID, userID, fn)
}

// inTx sets the context for one transaction. The settings are
// transaction-local (the same effect as SET LOCAL), so they never leak to
// the next user of a pooled connection. The transaction commits when fn
// returns nil and rolls back when fn returns an error or panics.
func inTx(ctx context.Context, db Beginner, tenantID, userID uuid.UUID, fn func(tx pgx.Tx) error) error {
	// An empty string means "none" to the policies. Both settings are
	// always written, so a value can never be inherited from elsewhere.
	tenant := ""
	if tenantID != uuid.Nil {
		tenant = tenantID.String()
	}
	return pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		// set_config(..., is_local => true) is SET LOCAL in a form that
		// accepts a bind parameter; SET itself cannot be parameterised.
		_, err := tx.Exec(ctx,
			"SELECT set_config('app.tenant_id', $1, true), set_config('app.user_id', $2, true)",
			tenant, userID.String())
		if err != nil {
			return fmt.Errorf("database: setting the tenant and user: %w", err)
		}
		return fn(tx)
	})
}
