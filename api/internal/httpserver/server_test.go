package httpserver

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Writ-HQ/writ/api/internal/apierror"
	"github.com/Writ-HQ/writ/api/internal/health"
	"github.com/Writ-HQ/writ/api/internal/oapi"
)

func discardLogger() *slog.Logger {
	return slog.New(slog.DiscardHandler)
}

func get(t *testing.T, h http.Handler, path string, header http.Header) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, path, nil)
	for k, v := range header {
		// Set canonicalises the key, as a real client request would.
		req.Header.Set(k, v[0])
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func status(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()
	var body struct {
		Status string `json:"status"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding body %q: %v", rec.Body.String(), err)
	}
	return body.Status
}

func TestHealthz(t *testing.T) {
	r := NewRouter(discardLogger(), health.New(discardLogger()))
	rec := get(t, r, "/healthz", nil)
	if rec.Code != http.StatusOK || status(t, rec) != "ok" {
		t.Errorf("GET /healthz = %d %s, want 200 ok", rec.Code, rec.Body.String())
	}
}

func TestReadyz(t *testing.T) {
	r := NewRouter(discardLogger(), health.New(discardLogger()))
	rec := get(t, r, "/readyz", nil)
	if rec.Code != http.StatusOK || status(t, rec) != "ok" {
		t.Errorf("GET /readyz = %d %s, want 200 ok", rec.Code, rec.Body.String())
	}
}

func TestReadyzFailingCheck(t *testing.T) {
	hh := health.New(discardLogger(), health.Check{
		Name: "database",
		Fn:   func(context.Context) error { return errors.New("down") },
	})
	rec := get(t, NewRouter(discardLogger(), hh), "/readyz", nil)
	if rec.Code != http.StatusServiceUnavailable || status(t, rec) != "unavailable" {
		t.Errorf("GET /readyz = %d %s, want 503 unavailable", rec.Code, rec.Body.String())
	}
}

func TestReadyzWhileShuttingDown(t *testing.T) {
	hh := health.New(discardLogger())
	r := NewRouter(discardLogger(), hh)
	hh.SetShuttingDown()

	if rec := get(t, r, "/readyz", nil); rec.Code != http.StatusServiceUnavailable {
		t.Errorf("GET /readyz = %d, want 503", rec.Code)
	}
	if rec := get(t, r, "/healthz", nil); rec.Code != http.StatusOK {
		t.Errorf("GET /healthz = %d, want 200", rec.Code)
	}
}

func TestHealthEndpointsRejectOtherMethods(t *testing.T) {
	r := NewRouter(discardLogger(), health.New(discardLogger()))
	for _, path := range []string{"/healthz", "/readyz"} {
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, httptest.NewRequestWithContext(t.Context(), http.MethodPost, path, nil))
		if rec.Code != http.StatusMethodNotAllowed {
			t.Errorf("POST %s = %d, want 405", path, rec.Code)
		}
	}
}

func TestRequestIDGenerated(t *testing.T) {
	r := NewRouter(discardLogger(), health.New(discardLogger()))
	first := get(t, r, "/healthz", nil).Header().Get(RequestIDHeader)
	second := get(t, r, "/healthz", nil).Header().Get(RequestIDHeader)
	if len(first) != 32 {
		t.Errorf("generated request ID %q, want 32 hex characters", first)
	}
	if first == second {
		t.Errorf("two requests got the same request ID %q", first)
	}
}

func TestRequestIDInbound(t *testing.T) {
	r := NewRouter(discardLogger(), health.New(discardLogger()))
	tests := []struct {
		name, inbound string
		wantEchoed    bool
	}{
		{"well formed", "abc-123_DEF.456", true},
		{"illegal characters", "abc 123\"{}", false},
		{"too long", strings.Repeat("a", 65), false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := get(t, r, "/healthz", http.Header{RequestIDHeader: {tt.inbound}})
			got := rec.Header().Get(RequestIDHeader)
			if got == "" {
				t.Fatal("no request ID on the response")
			}
			if echoed := got == tt.inbound; echoed != tt.wantEchoed {
				t.Errorf("request ID = %q for inbound %q, echoed = %v, want %v", got, tt.inbound, echoed, tt.wantEchoed)
			}
		})
	}
}

func TestRecoverReturns500AndLogs(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))
	r := NewRouter(logger, health.New(logger))
	r.Get("/boom", func(http.ResponseWriter, *http.Request) { panic("kaboom") })

	rec := get(t, r, "/boom", http.Header{RequestIDHeader: {"req-1"}})
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("GET /boom = %d, want 500", rec.Code)
	}
	if strings.Contains(rec.Body.String(), "kaboom") {
		t.Errorf("body leaks the panic value: %s", rec.Body.String())
	}

	var sawPanic, sawAccess bool
	for _, line := range strings.Split(strings.TrimSpace(logs.String()), "\n") {
		var entry map[string]any
		if err := json.Unmarshal([]byte(line), &entry); err != nil {
			t.Fatalf("log line is not JSON: %q", line)
		}
		if entry["request_id"] != "req-1" {
			t.Errorf("log line without the request ID: %s", line)
		}
		switch entry["msg"] {
		case "panic recovered":
			sawPanic = entry["panic"] == "kaboom"
		case "http request":
			sawAccess = entry["status"] == float64(http.StatusInternalServerError) && entry["route"] == "/boom"
		}
	}
	if !sawPanic || !sawAccess {
		t.Errorf("missing panic log (%v) or 500 access log (%v):\n%s", sawPanic, sawAccess, logs.String())
	}
}

func TestAccessLogOmitsRawPathAndQuery(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))
	r := NewRouter(logger, health.New(logger))
	r.Get("/people/{id}", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })

	get(t, r, "/people/jane-doe?email=jane@example.com", nil)

	out := logs.String()
	if !strings.Contains(out, `"route":"/people/{id}"`) {
		t.Errorf("access log does not carry the route pattern: %s", out)
	}
	if strings.Contains(out, "jane") {
		t.Errorf("access log leaks path or query values: %s", out)
	}
}

func decodeError(t *testing.T, rec *httptest.ResponseRecorder) oapi.Error {
	t.Helper()
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}
	var body oapi.Error
	dec := json.NewDecoder(rec.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&body); err != nil {
		t.Fatalf("body does not follow the Error schema: %v", err)
	}
	return body
}

func TestErrorsFollowTheErrorSchema(t *testing.T) {
	r := NewRouter(discardLogger(), health.New(discardLogger()))
	r.Get("/boom", func(http.ResponseWriter, *http.Request) { panic("kaboom") })

	tests := []struct {
		name, method, path string
		wantStatus         int
		wantCode           apierror.Code
	}{
		{"unknown path", http.MethodGet, "/v1/nothing-here", http.StatusNotFound, apierror.NotFound},
		{"wrong method", http.MethodPost, "/healthz", http.StatusMethodNotAllowed, apierror.MethodNotAllowed},
		{"panic", http.MethodGet, "/boom", http.StatusInternalServerError, apierror.InternalError},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequestWithContext(t.Context(), tt.method, tt.path, nil)
			req.Header.Set(RequestIDHeader, "req-42")
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", rec.Code, tt.wantStatus)
			}
			body := decodeError(t, rec)
			if body.Code != tt.wantCode || body.Message == "" || body.RequestId != "req-42" {
				t.Errorf("body = %+v, want code %q, a message and request_id req-42", body, tt.wantCode)
			}
		})
	}
}

func TestRequestErrorNamesTheParameterOnly(t *testing.T) {
	req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/v1/things?limit=jane@example.com", nil)
	rec := httptest.NewRecorder()
	requestError(rec, req, &oapi.InvalidParamFormatError{
		ParamName: "limit",
		Err:       errors.New(`cannot parse "jane@example.com"`),
	})

	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", rec.Code)
	}
	if strings.Contains(rec.Body.String(), "jane") {
		t.Errorf("body echoes the submitted value: %s", rec.Body.String())
	}
	body := decodeError(t, rec)
	if body.Code != apierror.BadRequest || body.Details == nil || *(*body.Details)[0].Field != "limit" {
		t.Errorf("body = %+v, want bad_request naming the limit parameter", body)
	}
}

func TestResponseErrorHidesTheCause(t *testing.T) {
	var logs bytes.Buffer
	req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/v1/things", nil)
	rec := httptest.NewRecorder()
	responseError(slog.New(slog.NewJSONHandler(&logs, nil)))(rec, req, errors.New("pq: connection refused"))

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", rec.Code)
	}
	if strings.Contains(rec.Body.String(), "connection refused") {
		t.Errorf("body leaks the cause: %s", rec.Body.String())
	}
	if body := decodeError(t, rec); body.Code != apierror.InternalError {
		t.Errorf("code = %q, want internal_error", body.Code)
	}
	if !strings.Contains(logs.String(), "connection refused") {
		t.Errorf("cause was not logged: %s", logs.String())
	}
}
