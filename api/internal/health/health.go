// Package health serves the liveness and readiness probes.
package health

import (
	"context"
	"log/slog"
	"sync/atomic"
	"time"

	"github.com/Writ-HQ/writ/api/internal/oapi"
)

const checkTimeout = 2 * time.Second

// Check is a named dependency check run by the readiness probe.
type Check struct {
	Name string
	Fn   func(ctx context.Context) error
}

// Handler implements the health operations of oapi.StrictServerInterface.
type Handler struct {
	logger       *slog.Logger
	checks       []Check
	shuttingDown atomic.Bool
}

// New returns a Handler whose readiness probe runs the given checks.
func New(logger *slog.Logger, checks ...Check) *Handler {
	return &Handler{logger: logger, checks: checks}
}

// SetShuttingDown makes the readiness probe fail from now on, so that load
// balancers stop sending new traffic while in-flight requests drain.
func (h *Handler) SetShuttingDown() {
	h.shuttingDown.Store(true)
}

// GetHealthz reports that the process is running. It checks no dependencies.
func (h *Handler) GetHealthz(context.Context, oapi.GetHealthzRequestObject) (oapi.GetHealthzResponseObject, error) {
	return oapi.GetHealthz200JSONResponse{Status: oapi.HealthStatusStatusOk}, nil
}

// GetReadyz reports whether the service can accept traffic.
func (h *Handler) GetReadyz(ctx context.Context, _ oapi.GetReadyzRequestObject) (oapi.GetReadyzResponseObject, error) {
	if h.shuttingDown.Load() {
		return oapi.GetReadyz503JSONResponse{Status: oapi.HealthStatusStatusUnavailable}, nil
	}
	if len(h.checks) == 0 {
		return oapi.GetReadyz200JSONResponse{Status: oapi.HealthStatusStatusOk}, nil
	}

	ctx, cancel := context.WithTimeout(ctx, checkTimeout)
	defer cancel()

	ready := true
	results := make(map[string]oapi.HealthStatusChecks, len(h.checks))
	for _, c := range h.checks {
		if err := c.Fn(ctx); err != nil {
			// The cause is logged but never returned to the caller.
			h.logger.WarnContext(ctx, "readiness check failed", "check", c.Name, "error", err)
			results[c.Name] = oapi.HealthStatusChecksFailed
			ready = false
			continue
		}
		results[c.Name] = oapi.HealthStatusChecksOk
	}

	if !ready {
		return oapi.GetReadyz503JSONResponse{Status: oapi.HealthStatusStatusUnavailable, Checks: &results}, nil
	}
	return oapi.GetReadyz200JSONResponse{Status: oapi.HealthStatusStatusOk, Checks: &results}, nil
}
