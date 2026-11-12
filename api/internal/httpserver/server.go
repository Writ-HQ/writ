// Package httpserver builds the HTTP router and server.
package httpserver

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/Writ-HQ/writ/api/internal/health"
	"github.com/Writ-HQ/writ/api/internal/oapi"
)

// api is the single implementation of the generated server interface. Each
// module contributes its operations by being embedded here.
type api struct {
	*health.Handler
}

var _ oapi.StrictServerInterface = api{}

// NewRouter returns the root router with the shared middleware and every
// operation in openapi/openapi.yaml mounted.
func NewRouter(logger *slog.Logger, hh *health.Handler) chi.Router {
	r := chi.NewRouter()

	// Order matters: the request ID must exist before anything logs, and
	// Recover sits inside AccessLog so that a panic is logged as a 500.
	r.Use(RequestID)
	r.Use(AccessLog(logger))
	r.Use(Recover(logger))

	r.NotFound(notFound)
	r.MethodNotAllowed(methodNotAllowed)

	strict := oapi.NewStrictHandlerWithOptions(api{Handler: hh}, nil, oapi.StrictHTTPServerOptions{
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
