// Package tenants owns tenants and memberships: who the customers are and
// which users belong to each, in what role.
//
// It is also where a request's tenant is established. Resolve is the one
// membership check: a tenant-scoped request reaches a handler only after
// Resolve has confirmed that the caller is an active member, and handlers
// then work inside database.WithTenant, where row-level security confines
// them to that tenant.
package tenants

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/Writ-HQ/writ/api/internal/audit"
	"github.com/Writ-HQ/writ/api/internal/auth"
	"github.com/Writ-HQ/writ/api/internal/database"
	"github.com/Writ-HQ/writ/api/internal/tenants/tenantsdb"
)

var (
	// ErrNotFound means the tenant does not exist as far as this caller
	// is concerned: it is missing, deleted, or the caller is not an
	// active member. The cases are deliberately indistinguishable.
	ErrNotFound = errors.New("tenants: not found")
	// ErrForbidden means the caller may not do this. For an action inside
	// a tenant it is returned only to members of that tenant; everyone
	// else gets ErrNotFound.
	ErrForbidden = errors.New("tenants: not allowed")
	// ErrInvalidCursor means the pagination cursor was not one this
	// service issued.
	ErrInvalidCursor = errors.New("tenants: invalid cursor")
)

// InvalidError reports input that failed validation. Field is the name of
// the request field; Required distinguishes a missing value from a bad one.
type InvalidError struct {
	Field    string
	Required bool
	Message  string
}

func (e *InvalidError) Error() string { return "tenants: " + e.Message }

// Tenant is a tenant as seen by one of its members.
type Tenant struct {
	ID            uuid.UUID
	Name          string
	Slug          string
	DefaultLocale string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// Membership is the caller's standing in one tenant: the result of the
// membership check for a request.
type Membership struct {
	Tenant Tenant
	Role   Role
}

type membershipKey struct{}

// ContextWithMembership returns ctx carrying the request's tenant and the
// caller's role in it.
func ContextWithMembership(ctx context.Context, m Membership) context.Context {
	return context.WithValue(ctx, membershipKey{}, m)
}

// MembershipFromContext returns the tenant the request acts in and the
// caller's role. ok is false on a request that is not tenant-scoped.
func MembershipFromContext(ctx context.Context) (m Membership, ok bool) {
	m, ok = ctx.Value(membershipKey{}).(Membership)
	return m, ok
}

// DB is what the service needs from the database. *pgxpool.Pool
// implements it. Every query goes through database.WithUser or
// database.WithTenant; the service never queries outside them.
type DB interface {
	database.Beginner
}

// Options configures a Service.
type Options struct {
	// SelfServe lets any signed-in user create a tenant. When false, only
	// platform administrators may.
	SelfServe bool
	// NewSlug generates a slug from a tenant's name. Tests replace it to
	// force collisions; leave it nil otherwise.
	NewSlug func(name string) string
}

// Service implements the tenants module.
type Service struct {
	db   DB
	opts Options
}

// NewService returns a Service. db is the application pool.
func NewService(db DB, opts Options) *Service {
	if opts.NewSlug == nil {
		opts.NewSlug = newSlug
	}
	return &Service{db: db, opts: opts}
}

const (
	maxNameRunes = 200
	// DefaultPageSize is how many tenants a list returns when the caller
	// does not say.
	DefaultPageSize = 25
	// MaxPageSize is the most a caller may ask for.
	MaxPageSize = 100
	// How many slugs to try before giving up. One is nearly always enough.
	slugAttempts = 5
	// PostgreSQL's code for a unique constraint violation.
	uniqueViolation = "23505"
	slugConstraint  = "tenants_slug_key"
)

// CanCreate reports whether the user may create a tenant.
func (s *Service) CanCreate(user auth.User) bool {
	return s.opts.SelfServe || user.PlatformAdmin
}

// Create makes a tenant with the user as its owner. The tenant, the
// owner's membership and the audit event are written in one transaction.
//
// defaultLocale may be empty, meaning English.
func (s *Service) Create(ctx context.Context, user auth.User, name, defaultLocale string) (Membership, error) {
	if !s.CanCreate(user) {
		return Membership{}, ErrForbidden
	}
	name, err := validName(name)
	if err != nil {
		return Membership{}, err
	}
	if defaultLocale == "" {
		defaultLocale = "en"
	}
	if err := validLocale(defaultLocale); err != nil {
		return Membership{}, err
	}

	for range slugAttempts {
		// The caller chooses the id so that the transaction can act as
		// the new tenant while creating it: that is what lets the insert
		// return its row and the first membership pass its policy.
		id, err := uuid.NewV7()
		if err != nil {
			return Membership{}, fmt.Errorf("tenants: generating an id: %w", err)
		}
		var created tenantsdb.Tenant
		err = database.WithTenant(ctx, s.db, id, user.ID, func(tx pgx.Tx) error {
			q := tenantsdb.New(tx)
			var err error
			created, err = q.CreateTenant(ctx, tenantsdb.CreateTenantParams{
				ID: id, Name: name, Slug: s.opts.NewSlug(name), DefaultLocale: defaultLocale,
			})
			if err != nil {
				return err
			}
			if _, err := q.CreateMembership(ctx, tenantsdb.CreateMembershipParams{
				TenantID: id, UserID: user.ID, Role: string(RoleOwner), Status: "active",
			}); err != nil {
				return err
			}
			return audit.Record(ctx, tx, audit.Event{
				TenantID: id, ActorUserID: user.ID,
				Action: "tenant.created", EntityType: "tenant", EntityID: id,
			})
		})
		if isSlugCollision(err) {
			// Never reported to the caller: try another suffix.
			continue
		}
		if err != nil {
			return Membership{}, fmt.Errorf("tenants: creating the tenant: %w", err)
		}
		return Membership{Tenant: fromRow(created), Role: RoleOwner}, nil
	}
	return Membership{}, errors.New("tenants: could not generate a unique slug")
}

func isSlugCollision(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == uniqueViolation && pgErr.ConstraintName == slugConstraint
}

// Resolve is the membership check behind every tenant-scoped request. It
// returns the tenant and the user's role, or ErrNotFound unless the user
// is an active member of a tenant that has not been deleted.
//
// It runs as the user, before any tenant is trusted: row-level security
// shows a user only their own memberships and the tenants those lead to.
func (s *Service) Resolve(ctx context.Context, user auth.User, tenantID uuid.UUID) (Membership, error) {
	var row tenantsdb.ResolveTenantForCurrentUserRow
	err := database.WithUser(ctx, s.db, user.ID, func(tx pgx.Tx) error {
		var err error
		row, err = tenantsdb.New(tx).ResolveTenantForCurrentUser(ctx, tenantID)
		return err
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return Membership{}, ErrNotFound
	}
	if err != nil {
		return Membership{}, fmt.Errorf("tenants: resolving the tenant: %w", err)
	}
	return Membership{Tenant: fromRow(row.Tenant), Role: Role(row.Role)}, nil
}

// List returns one page of the tenants the user is an active member of,
// oldest first, and the cursor for the next page ("" on the last page).
// limit of 0 means DefaultPageSize.
func (s *Service) List(ctx context.Context, user auth.User, cursor string, limit int) ([]Membership, string, error) {
	after, err := decodeCursor(cursor)
	if err != nil {
		return nil, "", err
	}
	if limit <= 0 {
		limit = DefaultPageSize
	}
	limit = min(limit, MaxPageSize)

	var rows []tenantsdb.ListTenantsForCurrentUserRow
	err = database.WithUser(ctx, s.db, user.ID, func(tx pgx.Tx) error {
		var err error
		// One more than asked for, to learn whether there is a next page.
		rows, err = tenantsdb.New(tx).ListTenantsForCurrentUser(ctx, tenantsdb.ListTenantsForCurrentUserParams{
			After: after, PageSize: int32(limit) + 1, //nolint:gosec // limit is at most MaxPageSize
		})
		return err
	})
	if err != nil {
		return nil, "", fmt.Errorf("tenants: listing tenants: %w", err)
	}

	next := ""
	if len(rows) > limit {
		rows = rows[:limit]
		next = encodeCursor(rows[limit-1].Tenant.ID)
	}
	out := make([]Membership, len(rows))
	for i, row := range rows {
		out[i] = Membership{Tenant: fromRow(row.Tenant), Role: Role(row.Role)}
	}
	return out, next, nil
}

// Update changes the tenant's name, default locale, or both; a nil
// argument leaves that field alone. m is the caller's resolved membership
// and must hold TenantUpdate. The change and its audit event are written
// in one transaction.
func (s *Service) Update(ctx context.Context, user auth.User, m Membership, name, defaultLocale *string) (Membership, error) {
	if !m.Role.Can(TenantUpdate) {
		return Membership{}, ErrForbidden
	}
	if name == nil && defaultLocale == nil {
		return Membership{}, &InvalidError{Field: "name", Required: true, Message: "Send name, default_locale, or both."}
	}
	var changed []string
	if name != nil {
		clean, err := validName(*name)
		if err != nil {
			return Membership{}, err
		}
		name = &clean
		changed = append(changed, "name")
	}
	if defaultLocale != nil {
		if err := validLocale(*defaultLocale); err != nil {
			return Membership{}, err
		}
		changed = append(changed, "default_locale")
	}

	var updated tenantsdb.Tenant
	err := database.WithTenant(ctx, s.db, m.Tenant.ID, user.ID, func(tx pgx.Tx) error {
		var err error
		updated, err = tenantsdb.New(tx).UpdateTenant(ctx, tenantsdb.UpdateTenantParams{
			Name: name, DefaultLocale: defaultLocale,
		})
		if err != nil {
			return err
		}
		// Which fields, not their values.
		return audit.Record(ctx, tx, audit.Event{
			TenantID: m.Tenant.ID, ActorUserID: user.ID,
			Action: "tenant.updated", EntityType: "tenant", EntityID: m.Tenant.ID,
			Metadata: map[string]any{"fields": changed},
		})
	})
	if errors.Is(err, pgx.ErrNoRows) {
		// Deleted between the membership check and the update.
		return Membership{}, ErrNotFound
	}
	if err != nil {
		return Membership{}, fmt.Errorf("tenants: updating the tenant: %w", err)
	}
	return Membership{Tenant: fromRow(updated), Role: m.Role}, nil
}

func validName(name string) (string, error) {
	name = strings.TrimSpace(name)
	switch {
	case name == "":
		return "", &InvalidError{Field: "name", Required: true, Message: "name is required."}
	case !utf8.ValidString(name) || utf8.RuneCountInString(name) > maxNameRunes:
		return "", &InvalidError{Field: "name", Message: "name must be at most 200 characters."}
	}
	return name, nil
}

func validLocale(locale string) error {
	if locale != "en" && locale != "fr" {
		return &InvalidError{Field: "default_locale", Message: "default_locale must be en or fr."}
	}
	return nil
}

func fromRow(t tenantsdb.Tenant) Tenant {
	return Tenant{
		ID: t.ID, Name: t.Name, Slug: t.Slug, DefaultLocale: t.DefaultLocale,
		CreatedAt: t.CreatedAt, UpdatedAt: t.UpdatedAt,
	}
}
