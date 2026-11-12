package health

import (
	"context"
	"errors"
	"log/slog"
	"testing"

	"github.com/Writ-HQ/writ/api/internal/oapi"
)

func discardLogger() *slog.Logger {
	return slog.New(slog.DiscardHandler)
}

func failing(context.Context) error { return errors.New("down") }

func passing(context.Context) error { return nil }

func TestGetHealthz(t *testing.T) {
	// Liveness must not depend on checks or on shutdown state.
	h := New(discardLogger(), Check{Name: "database", Fn: failing})
	h.SetShuttingDown()

	res, err := h.GetHealthz(t.Context(), oapi.GetHealthzRequestObject{})
	if err != nil {
		t.Fatalf("GetHealthz() error = %v", err)
	}
	got, ok := res.(oapi.GetHealthz200JSONResponse)
	if !ok || got.Status != oapi.HealthStatusStatusOk {
		t.Errorf("GetHealthz() = %#v, want 200 ok", res)
	}
}

func TestGetReadyzWithoutChecks(t *testing.T) {
	res, err := New(discardLogger()).GetReadyz(t.Context(), oapi.GetReadyzRequestObject{})
	if err != nil {
		t.Fatalf("GetReadyz() error = %v", err)
	}
	got, ok := res.(oapi.GetReadyz200JSONResponse)
	if !ok || got.Status != oapi.HealthStatusStatusOk || got.Checks != nil {
		t.Errorf("GetReadyz() = %#v, want 200 ok without checks", res)
	}
}

func TestGetReadyzWithPassingChecks(t *testing.T) {
	h := New(discardLogger(), Check{Name: "database", Fn: passing})
	res, err := h.GetReadyz(t.Context(), oapi.GetReadyzRequestObject{})
	if err != nil {
		t.Fatalf("GetReadyz() error = %v", err)
	}
	got, ok := res.(oapi.GetReadyz200JSONResponse)
	if !ok || got.Status != oapi.HealthStatusStatusOk {
		t.Fatalf("GetReadyz() = %#v, want 200 ok", res)
	}
	if (*got.Checks)["database"] != oapi.HealthStatusChecksOk {
		t.Errorf("checks = %v, want database ok", *got.Checks)
	}
}

func TestGetReadyzWithFailingCheck(t *testing.T) {
	h := New(discardLogger(),
		Check{Name: "database", Fn: failing},
		Check{Name: "queue", Fn: passing},
	)
	res, err := h.GetReadyz(t.Context(), oapi.GetReadyzRequestObject{})
	if err != nil {
		t.Fatalf("GetReadyz() error = %v", err)
	}
	got, ok := res.(oapi.GetReadyz503JSONResponse)
	if !ok || got.Status != oapi.HealthStatusStatusUnavailable {
		t.Fatalf("GetReadyz() = %#v, want 503 unavailable", res)
	}
	checks := *got.Checks
	if checks["database"] != oapi.HealthStatusChecksFailed || checks["queue"] != oapi.HealthStatusChecksOk {
		t.Errorf("checks = %v, want database failed and queue ok", checks)
	}
}

func TestGetReadyzWhileShuttingDown(t *testing.T) {
	called := false
	h := New(discardLogger(), Check{Name: "database", Fn: func(context.Context) error {
		called = true
		return nil
	}})
	h.SetShuttingDown()

	res, err := h.GetReadyz(t.Context(), oapi.GetReadyzRequestObject{})
	if err != nil {
		t.Fatalf("GetReadyz() error = %v", err)
	}
	got, ok := res.(oapi.GetReadyz503JSONResponse)
	if !ok || got.Status != oapi.HealthStatusStatusUnavailable {
		t.Errorf("GetReadyz() = %#v, want 503 unavailable", res)
	}
	if called {
		t.Error("checks ran while shutting down")
	}
}
