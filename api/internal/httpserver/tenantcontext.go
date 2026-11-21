package httpserver

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Writ-HQ/writ/api/internal/apierror"
	"github.com/Writ-HQ/writ/api/internal/auth"
	"github.com/Writ-HQ/writ/api/internal/tenants"
)

// tenantParam is the path parameter that names the request's tenant. Any
// operation whose path contains {tenant_id} is tenant-scoped.
const tenantParam = "tenant_id"

// TenantResolver checks that a user is an active member of a tenant.
// *tenants.Service implements it.
type TenantResolver interface {
	Resolve(ctx context.Context, user auth.User, tenantID uuid.UUID) (tenants.Membership, error)
}

// TenantContext establishes the tenant of every tenant-scoped request. For
// any operation with a {tenant_id} path parameter it checks that the
// authenticated user is an active member of that tenant and stores the
// tenant and the user's role in the request context
// (tenants.MembershipFromContext). The handler runs only if that succeeds.
//
// Anything else is 404 with the same body as an unknown path: a tenant
// that does not exist or has been deleted, one the user is not in, a
// membership that is suspended, invited or removed, and an ID that is not
// a UUID. A caller cannot tell these apart, so cannot learn which tenants
// exist.
//
// Because it keys on the parameter name, a new tenant-scoped operation is
// covered by declaring its path under /v1/tenants/{tenant_id}; there is
// nothing to remember to add.
func TenantContext(logger *slog.Logger, resolver TenantResolver) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw := chi.URLParam(r, tenantParam)
			if raw == "" {
				// Not a tenant-scoped operation.
				next.ServeHTTP(w, r)
				return
			}

			tenantID, err := uuid.Parse(raw)
			if err != nil {
				notFound(w, r)
				return
			}
			user, ok := auth.UserFromContext(r.Context())
			if !ok {
				// Authentication runs first for everything that is not
				// public, and no public operation is tenant-scoped.
				logger.ErrorContext(r.Context(), "tenant-scoped request without an authenticated user",
					slog.String("request_id", RequestIDFromContext(r.Context())))
				WriteError(w, r, http.StatusInternalServerError, apierror.InternalError, "An unexpected error occurred.")
				return
			}

			membership, err := resolver.Resolve(r.Context(), user, tenantID)
			switch {
			case err == nil:
				next.ServeHTTP(w, r.WithContext(tenants.ContextWithMembership(r.Context(), membership)))
			case errors.Is(err, tenants.ErrNotFound):
				notFound(w, r)
			default:
				logger.ErrorContext(r.Context(), "resolving the tenant failed",
					slog.String("request_id", RequestIDFromContext(r.Context())), slog.Any("error", err))
				WriteError(w, r, http.StatusInternalServerError, apierror.InternalError, "An unexpected error occurred.")
			}
		})
	}
}
