package httpserver

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/Writ-HQ/writ/api/internal/apierror"
)

// RequestIDHeader is the header that carries the request ID in both
// directions.
const RequestIDHeader = "X-Request-ID"

const maxRequestIDLen = 64

type requestIDKey struct{}

// RequestIDFromContext returns the request ID stored by the RequestID
// middleware, or "" when there is none.
func RequestIDFromContext(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey{}).(string)
	return id
}

// RequestID reuses a well-formed inbound X-Request-ID or generates a new
// one, stores it in the request context and echoes it on the response.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get(RequestIDHeader)
		if !validRequestID(id) {
			id = newRequestID()
		}
		w.Header().Set(RequestIDHeader, id)
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), requestIDKey{}, id)))
	})
}

// validRequestID accepts only short IDs made of unreserved characters, so a
// client cannot inject arbitrary content into logs and response headers.
func validRequestID(id string) bool {
	if id == "" || len(id) > maxRequestIDLen {
		return false
	}
	for _, c := range id {
		switch {
		case c >= 'a' && c <= 'z', c >= 'A' && c <= 'Z', c >= '0' && c <= '9', c == '-', c == '_', c == '.':
		default:
			return false
		}
	}
	return true
}

func newRequestID() string {
	var b [16]byte
	// crypto/rand.Read never returns an error.
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

// AccessLog writes one structured log line per request. It logs the matched
// route pattern instead of the raw URL, and no client address, query string
// or headers, so that personal data never reaches the logs.
func AccessLog(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

			defer func() {
				route := chi.RouteContext(r.Context()).RoutePattern()
				level := slog.LevelInfo
				switch route {
				case "":
					route = "unmatched"
				case "/healthz", "/readyz":
					level = slog.LevelDebug
				}
				status := ww.Status()
				if status == 0 {
					status = http.StatusOK
				}
				logger.LogAttrs(r.Context(), level, "http request",
					slog.String("request_id", RequestIDFromContext(r.Context())),
					slog.String("method", r.Method),
					slog.String("route", route),
					slog.Int("status", status),
					slog.Int("bytes", ww.BytesWritten()),
					slog.Duration("duration", time.Since(start)),
				)
			}()

			next.ServeHTTP(ww, r)
		})
	}
}

// Recover turns a panic in a handler into a logged 500 response.
func Recover(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				rec := recover()
				if rec == nil {
					return
				}
				// ErrAbortHandler is the sanctioned way to abort a response;
				// net/http must see it.
				if err, ok := rec.(error); ok && errors.Is(err, http.ErrAbortHandler) {
					panic(rec)
				}

				logger.ErrorContext(r.Context(), "panic recovered",
					slog.String("request_id", RequestIDFromContext(r.Context())),
					slog.Any("panic", rec),
					slog.String("stack", string(debug.Stack())),
				)

				// Only write an error body if the handler had not started
				// the response.
				if ww, ok := w.(middleware.WrapResponseWriter); ok && ww.Status() != 0 {
					return
				}
				WriteError(w, r, http.StatusInternalServerError, apierror.InternalError, "An unexpected error occurred.")
			}()

			next.ServeHTTP(w, r)
		})
	}
}
