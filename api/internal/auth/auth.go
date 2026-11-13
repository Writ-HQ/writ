// Package auth authenticates requests. It verifies the access token issued
// by the identity provider (OpenID Connect; Zitadel) and maps it to a row
// in users, which this module owns.
//
// It does not decide what a user may do. Permission checks belong to the
// module that owns the resource.
package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/Writ-HQ/writ/api/internal/auth/authdb"
)

// User is the authenticated user of a request.
type User struct {
	ID uuid.UUID
	// Email is nil until the identity provider has supplied a verified
	// address. It is personal data: never log it.
	Email *string
	// DisplayName is personal data too.
	DisplayName string
	// Locale is "en" or "fr".
	Locale string
}

type userKey struct{}

// ContextWithUser returns ctx carrying the authenticated user.
func ContextWithUser(ctx context.Context, u User) context.Context {
	return context.WithValue(ctx, userKey{}, u)
}

// UserFromContext returns the authenticated user. ok is false for a
// request that was not authenticated, which only happens on public
// endpoints.
func UserFromContext(ctx context.Context) (u User, ok bool) {
	u, ok = ctx.Value(userKey{}).(User)
	return u, ok
}

// TokenVerifier verifies a bearer token. *Verifier implements it.
type TokenVerifier interface {
	Verify(ctx context.Context, token string) (Claims, error)
}

// Service authenticates bearer tokens.
type Service struct {
	verifier TokenVerifier
	db       authdb.DBTX
}

// NewService returns a Service. db is the application pool.
func NewService(verifier TokenVerifier, db authdb.DBTX) *Service {
	return &Service{verifier: verifier, db: db}
}

// Authenticate verifies the token and returns the user it belongs to,
// creating the user on their first request. The error wraps
// ErrInvalidToken or ErrUnavailable when the token is the problem; any
// other error is a failure on our side.
func (s *Service) Authenticate(ctx context.Context, token string) (User, error) {
	claims, err := s.verifier.Verify(ctx, token)
	if err != nil {
		return User{}, err
	}

	// provision_user is the one database path that needs no user context:
	// it finds or creates exactly the row for this verified subject. The
	// profile values only matter when the row is created.
	row, err := authdb.New(s.db).ProvisionUser(ctx, authdb.ProvisionUserParams{
		ExternalAuthID: claims.Subject,
		Email:          emailFromClaim(claims.Email),
		DisplayName:    displayNameFromClaim(claims.Name),
		Locale:         localeFromClaim(claims.Locale),
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, errors.New("auth: provisioning returned no user")
	}
	if err != nil {
		return User{}, fmt.Errorf("auth: provisioning the user: %w", err)
	}
	return User{ID: row.ID, Email: row.Email, DisplayName: row.DisplayName, Locale: row.Locale}, nil
}

const (
	maxEmailBytes       = 320
	maxDisplayNameRunes = 200
)

// The claims are verified to come from the identity provider, but they are
// still input: anything that does not fit is dropped rather than stored.

func emailFromClaim(v string) *string {
	v = strings.TrimSpace(v)
	if v == "" || len(v) > maxEmailBytes || !strings.Contains(v, "@") || !utf8.ValidString(v) {
		return nil
	}
	return &v
}

func displayNameFromClaim(v string) string {
	v = strings.TrimSpace(v)
	if !utf8.ValidString(v) || utf8.RuneCountInString(v) > maxDisplayNameRunes {
		return ""
	}
	return v
}

// localeFromClaim maps a locale such as "fr-CA" to a language the
// interface supports, defaulting to English.
func localeFromClaim(v string) string {
	lang, _, _ := strings.Cut(strings.ToLower(strings.TrimSpace(v)), "-")
	if lang, _, _ = strings.Cut(lang, "_"); lang == "fr" {
		return "fr"
	}
	return "en"
}
