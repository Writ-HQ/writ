// Package auth authenticates requests. It verifies the access token issued
// by the identity provider (OpenID Connect; Zitadel) and maps it to a row
// in users, which this module owns.
//
// It does not decide what a user may do. Permission checks belong to the
// module that owns the resource.
package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/sync/singleflight"

	"github.com/Writ-HQ/writ/api/internal/auth/authdb"
	"github.com/Writ-HQ/writ/api/internal/database"
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

// DB is what the service needs from the database: plain queries for
// provisioning and transactions for everything done as the user.
// *pgxpool.Pool implements it.
type DB interface {
	authdb.DBTX
	database.Beginner
}

// Options configures a Service.
type Options struct {
	// Profiles fetches a user's profile from the identity provider. When
	// nil, profiles are never synced.
	Profiles ProfileSource
	// RequireMFA rejects tokens that were not obtained with multi-factor
	// authentication, as judged by MFAMethods.
	RequireMFA bool
	// MFAMethods are the authentication-method values that count as
	// multi-factor. A token passes if it has at least one of them.
	MFAMethods []string
	// Logger receives warnings about profile syncs that failed. It is
	// never given personal data. Defaults to discarding.
	Logger *slog.Logger
	// Now is the clock. Defaults to time.Now.
	Now func() time.Time
}

const (
	// A stored profile older than this is refreshed from the provider.
	profileMaxAge = 24 * time.Hour
	// After a sync attempt, successful or not, the same user is not
	// synced again by this process for this long.
	profileSyncInterval = time.Minute
	profileSyncTimeout  = 5 * time.Second
	// At most one auth.mfa_required event per user per window, so that a
	// client retrying in a loop cannot fill the table.
	mfaEventInterval = 10 * time.Minute
)

// Security event types. They must match the CHECK constraint on
// security_events.event_type.
const (
	eventEmailChanged = "profile.email_changed"
	eventMFARequired  = "auth.mfa_required"
)

// Service authenticates bearer tokens.
type Service struct {
	verifier TokenVerifier
	db       DB
	opts     Options

	// syncs makes concurrent requests from one user share one sync.
	syncs         singleflight.Group
	syncAttempted *recently
	mfaRecorded   *recently
}

// NewService returns a Service. db is the application pool.
func NewService(verifier TokenVerifier, db DB, opts Options) *Service {
	if opts.Logger == nil {
		opts.Logger = slog.New(slog.DiscardHandler)
	}
	if opts.Now == nil {
		opts.Now = time.Now
	}
	return &Service{
		verifier:      verifier,
		db:            db,
		opts:          opts,
		syncAttempted: newRecently(profileSyncInterval, opts.Now),
		mfaRecorded:   newRecently(mfaEventInterval, opts.Now),
	}
}

// Authenticate verifies the token and returns the user it belongs to,
// creating the user on their first request. The error wraps
// ErrInvalidToken, ErrAccountDisabled, ErrMFARequired or ErrUnavailable
// when the token or the account is the problem; any other error is a
// failure on our side.
func (s *Service) Authenticate(ctx context.Context, token string) (User, error) {
	claims, err := s.verifier.Verify(ctx, token)
	if err != nil {
		return User{}, err
	}

	row, err := s.provision(ctx, claims.Subject)
	if err != nil {
		return User{}, err
	}

	// The kill switch. A token stays valid until it expires even after the
	// user is disabled at the identity provider; this is checked on every
	// request, from the row just read, and takes effect at once. Nothing
	// else is done for a disabled account: no profile sync, no events.
	if row.DisabledAt != nil {
		return User{}, ErrAccountDisabled
	}

	if s.opts.RequireMFA && !hasAny(claims.AuthMethods, s.opts.MFAMethods) {
		s.recordMFARequired(ctx, row.ID)
		return User{}, ErrMFARequired
	}

	if s.opts.Profiles != nil && s.profileIsStale(row) {
		row = s.syncProfile(ctx, row, token)
	}
	return User{ID: row.ID, Email: row.Email, DisplayName: row.DisplayName, Locale: row.Locale}, nil
}

// provision finds or creates the user for a verified subject.
// provision_user is the one database path that needs no user context. A
// new user starts with an empty profile, which the first sync fills in.
func (s *Service) provision(ctx context.Context, subject string) (authdb.User, error) {
	row, err := authdb.New(s.db).ProvisionUser(ctx, authdb.ProvisionUserParams{
		ExternalAuthID: subject,
		DisplayName:    "",
		Locale:         "en",
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return authdb.User{}, errors.New("auth: provisioning returned no user")
	}
	if err != nil {
		return authdb.User{}, fmt.Errorf("auth: provisioning the user: %w", err)
	}
	return row, nil
}

func hasAny(have, want []string) bool {
	for _, v := range have {
		if slices.Contains(want, v) {
			return true
		}
	}
	return false
}

// recordMFARequired writes a security event for the rejected user. Failing
// to record it must not turn the rejection into a server error.
func (s *Service) recordMFARequired(ctx context.Context, userID uuid.UUID) {
	if !s.mfaRecorded.firstIn(userID) {
		return
	}
	err := database.WithUser(ctx, s.db, userID, func(tx pgx.Tx) error {
		_, err := authdb.New(tx).InsertSecurityEvent(ctx, authdb.InsertSecurityEventParams{
			EventType: eventMFARequired,
			Metadata:  json.RawMessage(`{}`),
		})
		return err
	})
	if err != nil {
		s.opts.Logger.ErrorContext(ctx, "recording the mfa_required event failed",
			slog.String("user_id", userID.String()), slog.Any("error", err))
	}
}

func (s *Service) profileIsStale(row authdb.User) bool {
	return row.ProfileSyncedAt == nil || s.opts.Now().Sub(*row.ProfileSyncedAt) > profileMaxAge
}

// syncProfile copies the user's profile from the identity provider and
// returns the updated row. It never fails the request: if the provider or
// the database cannot be reached, the stored profile is returned as it is
// and the sync is tried again later.
//
// Concurrent requests from the same user share one call to the provider.
func (s *Service) syncProfile(ctx context.Context, row authdb.User, token string) authdb.User {
	result, _, _ := s.syncs.Do(row.ID.String(), func() (any, error) {
		// One request's cancellation must not abort the sync that others
		// are waiting on.
		ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), profileSyncTimeout)
		defer cancel()

		// A sync that finished a moment ago, started by a request that
		// arrived just before this one: use its result instead of calling
		// the provider again. After a failure, this is the retry delay.
		if s.syncAttempted.did(row.ID) {
			if fresh, err := s.provision(ctx, row.ExternalAuthID); err == nil {
				return fresh, nil
			}
			return row, nil
		}
		s.syncAttempted.mark(row.ID)

		updated, err := s.fetchAndStoreProfile(ctx, row, token)
		if err != nil {
			// The error is ours or the provider's status; it carries no
			// profile data.
			s.opts.Logger.WarnContext(ctx, "profile sync failed; keeping the stored profile",
				slog.String("user_id", row.ID.String()), slog.Any("error", err))
			return row, nil
		}
		return updated, nil
	})
	return result.(authdb.User)
}

func (s *Service) fetchAndStoreProfile(ctx context.Context, row authdb.User, token string) (authdb.User, error) {
	profile, err := s.opts.Profiles.Profile(ctx, token)
	if err != nil {
		return authdb.User{}, err
	}
	// The specification requires this check: a userinfo response for a
	// different subject must not be used.
	if profile.Subject != row.ExternalAuthID {
		return authdb.User{}, errors.New("auth: the userinfo response is for a different subject")
	}

	params := authdb.SyncCurrentUserProfileParams{SyncedAt: s.opts.Now()}
	if profile.Email != nil {
		params.Email = emailFromClaim(*profile.Email)
	}
	if profile.Name != nil {
		params.DisplayName = new(displayNameFromClaim(*profile.Name))
	}
	if profile.Locale != nil {
		params.Locale = new(localeFromClaim(*profile.Locale))
	}
	// An address replacing a different one is worth telling the user
	// about. The first address a user ever gets is not a change.
	emailChanged := row.Email != nil && params.Email != nil && *row.Email != *params.Email

	var updated authdb.User
	err = database.WithUser(ctx, s.db, row.ID, func(tx pgx.Tx) error {
		q := authdb.New(tx)
		var err error
		if updated, err = q.SyncCurrentUserProfile(ctx, params); err != nil {
			return err
		}
		if emailChanged {
			// No addresses in the event: metadata holds no personal data.
			_, err = q.InsertSecurityEvent(ctx, authdb.InsertSecurityEventParams{
				EventType: eventEmailChanged,
				Metadata:  json.RawMessage(`{}`),
			})
		}
		return err
	})
	if err != nil {
		return authdb.User{}, fmt.Errorf("auth: storing the profile: %w", err)
	}
	return updated, nil
}

const (
	maxEmailBytes       = 320
	maxDisplayNameRunes = 200
)

// The profile comes from the identity provider, but it is still input:
// anything that does not fit is dropped rather than stored.

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
