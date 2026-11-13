package httpserver

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"slices"
	"strings"

	"github.com/Writ-HQ/writ/api/internal/apierror"
	"github.com/Writ-HQ/writ/api/internal/auth"
)

// Authenticator turns a bearer token into a user. *auth.Service
// implements it.
type Authenticator interface {
	Authenticate(ctx context.Context, token string) (auth.User, error)
}

// publicOperations are the API operations served without authentication.
// They must be exactly the operations marked `security: []` in
// openapi/openapi.yaml; a test fails if the two disagree. Anything else,
// including a path that does not exist, requires a valid token.
var publicOperations = []string{
	"GET /healthz",
	"GET /readyz",
}

// Authenticate requires a valid bearer access token on every request that
// is not to a public endpoint, and stores the authenticated user in the
// request context (auth.UserFromContext).
//
// The public endpoints are publicOperations plus alsoPublic, which is for
// routes that are not API operations: the documentation pages. Each entry
// is a method and an exact path, such as "GET /docs".
//
// A missing or rejected token gets 401. The response never says which
// check failed; the reason is logged. If the identity provider's keys
// cannot be fetched the response is 503, so that clients retry instead of
// signing the user out.
func Authenticate(logger *slog.Logger, authenticator Authenticator, alsoPublic ...string) func(http.Handler) http.Handler {
	public := map[string]bool{}
	for _, endpoint := range append(slices.Clone(publicOperations), alsoPublic...) {
		public[endpoint] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if public[r.Method+" "+r.URL.Path] {
				next.ServeHTTP(w, r)
				return
			}

			token, ok := bearerToken(r)
			if !ok {
				w.Header().Set("WWW-Authenticate", "Bearer")
				WriteError(w, r, http.StatusUnauthorized, apierror.Unauthenticated, "Authentication is required.")
				return
			}

			user, err := authenticator.Authenticate(r.Context(), token)
			requestID := slog.String("request_id", RequestIDFromContext(r.Context()))
			switch {
			case err == nil:
				next.ServeHTTP(w, r.WithContext(auth.ContextWithUser(r.Context(), user)))

			case errors.Is(err, auth.ErrInvalidToken):
				// The reason names the failed check. It contains neither
				// the token nor any of its claims.
				logger.InfoContext(r.Context(), "token rejected", requestID, slog.String("reason", err.Error()))
				w.Header().Set("WWW-Authenticate", `Bearer error="invalid_token"`)
				WriteError(w, r, http.StatusUnauthorized, apierror.Unauthenticated, "Authentication is required.")

			case errors.Is(err, auth.ErrAccountDisabled):
				// The token is genuine, so telling its holder why it is
				// refused reveals nothing to anyone else. Signing in again
				// will not help, hence no challenge that invites it.
				logger.InfoContext(r.Context(), "token rejected", requestID, slog.String("reason", err.Error()))
				w.Header().Set("WWW-Authenticate", "Bearer")
				WriteError(w, r, http.StatusUnauthorized, apierror.AccountDisabled, "The account is disabled.")

			case errors.Is(err, auth.ErrMFARequired):
				// The token is genuine; the sign-in behind it was not
				// strong enough. The challenge follows RFC 9470.
				logger.InfoContext(r.Context(), "token rejected", requestID, slog.String("reason", err.Error()))
				w.Header().Set("WWW-Authenticate", `Bearer error="insufficient_user_authentication"`)
				WriteError(w, r, http.StatusUnauthorized, apierror.MFARequired, "Multi-factor authentication is required.")

			case errors.Is(err, auth.ErrUnavailable):
				logger.WarnContext(r.Context(), "identity provider keys unavailable", requestID)
				w.Header().Set("Retry-After", "5")
				WriteError(w, r, http.StatusServiceUnavailable, apierror.ServiceUnavailable, "Authentication is temporarily unavailable.")

			default:
				logger.ErrorContext(r.Context(), "authentication failed", requestID, slog.Any("error", err))
				WriteError(w, r, http.StatusInternalServerError, apierror.InternalError, "An unexpected error occurred.")
			}
		})
	}
}

// bearerToken extracts the token from "Authorization: Bearer <token>". The
// scheme is case-insensitive (RFC 9110).
func bearerToken(r *http.Request) (string, bool) {
	values := r.Header.Values("Authorization")
	if len(values) != 1 {
		return "", false
	}
	scheme, token, found := strings.Cut(values[0], " ")
	token = strings.TrimSpace(token)
	if !found || !strings.EqualFold(scheme, "Bearer") || token == "" {
		return "", false
	}
	return token, true
}
