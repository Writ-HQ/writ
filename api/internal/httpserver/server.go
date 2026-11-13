// Package httpserver builds the HTTP router and server.
package httpserver

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/Writ-HQ/writ/api/internal/auth"
	"github.com/Writ-HQ/writ/api/internal/health"
	"github.com/Writ-HQ/writ/api/internal/oapi"
)

// Handlers are the modules' implementations of the API operations.
type Handlers struct {
	Health  *health.Handler
	Account *auth.Handler
}

// api is the single implementation of the generated server interface. Each
// module contributes its operations by being embedded here.
type api struct {
	*health.Handler
	*accountHandler
}

// An embedded field is named after its type, and two fields cannot both be
// called Handler.
type accountHandler = auth.Handler

var _ oapi.StrictServerInterface = api{}

// Options are the router's settings.
type Options struct {
	// Docs serves interactive API documentation at /docs, without
	// authentication. For non-production environments only.
	Docs bool
}

// NewRouter returns the root router with the shared middleware and every
// operation in openapi/openapi.yaml mounted. Every request must be
// authenticated except those to the public endpoints.
func NewRouter(logger *slog.Logger, authenticator Authenticator, h Handlers, opts Options) chi.Router {
	r := chi.NewRouter()

	// Order matters: the request ID must exist before anything logs,
	// Recover sits inside AccessLog so that a panic is logged as a 500,
	// and Authenticate comes before routing so that an unauthenticated
	// caller learns nothing about which paths exist or how they validate.
	r.Use(RequestID)
	r.Use(AccessLog(logger))
	r.Use(Recover(logger))
	var alsoPublic []string
	if opts.Docs {
		alsoPublic = docsEndpoints
	}
	r.Use(Authenticate(logger, authenticator, alsoPublic...))

	r.NotFound(notFound)
	r.MethodNotAllowed(methodNotAllowed)

	if opts.Docs {
		mountDocs(r)
	}

	strict := oapi.NewStrictHandlerWithOptions(api{Handler: h.Health, accountHandler: h.Account}, nil, oapi.StrictHTTPServerOptions{
		RequestErrorHandlerFunc:  requestError,
		ResponseErrorHandlerFunc: responseError(logger),
	})
	oapi.HandlerWithOptions(strict, oapi.ChiServerOptions{
		BaseRouter:       r,
		ErrorHandlerFunc: requestError,
	})

	return r
}

// New returns an http.Server with conservative timeouts.
func New(addr string, handler http.Handler, logger *slog.Logger) *http.Server {
	return &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		ErrorLog:          slog.NewLogLogger(logger.Handler(), slog.LevelError),
	}
}
