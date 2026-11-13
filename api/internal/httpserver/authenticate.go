package httpserver

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/Writ-HQ/writ/api/internal/apierror"
	"github.com/Writ-HQ/writ/api/internal/auth"
)

// Authenticator turns a bearer token into a user. *auth.Service
// implements it.
type Authenticator interface {
	Authenticate(ctx context.Context, token string) (auth.User, error)
}

// publicEndpoints are the only requests served without authentication.
// They must be exactly the operations marked `security: []` in
// openapi/openapi.yaml; a test fails if the two disagree. Anything not
// listed here, including a path that does not exist, requires a valid
// token.
var publicEndpoints = map[string]bool{
	"GET /healthz": true,
	"GET /readyz":  true,
}

// Authenticate requires a valid bearer access token on every request that
// is not to a public endpoint, and stores the authenticated user in the
// request context (auth.UserFromContext).
//
// A missing or rejected token gets 401. The response never says which
// check failed; the reason is logged. If the identity provider's keys
// cannot be fetched the response is 503, so that clients retry instead of
// signing the user out.
func Authenticate(logger *slog.Logger, authenticator Authenticator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if publicEndpoints[r.Method+" "+r.URL.Path] {
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
