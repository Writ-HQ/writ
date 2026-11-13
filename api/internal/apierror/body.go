package apierror

import (
	"context"

	"github.com/Writ-HQ/writ/api/internal/oapi"
)

type requestIDKey struct{}

// WithRequestID returns ctx carrying the request's ID. The HTTP layer
// calls it once per request.
func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, requestIDKey{}, id)
}

// RequestID returns the request's ID, or "" outside a request.
func RequestID(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey{}).(string)
	return id
}

// New builds the body of an error response, following the Error schema,
// for a handler to return as a typed response. It takes the request ID
// from ctx, so that every error body carries it whoever writes it. The
// message is for developers and must never contain personal data.
func New(ctx context.Context, code Code, message string, details ...oapi.ErrorDetail) oapi.Error {
	body := oapi.Error{Code: code, Message: message, RequestId: RequestID(ctx)}
	if len(details) > 0 {
		body.Details = &details
	}
	return body
}

// Detail builds one entry of an error's details: why a field or parameter
// was rejected.
func Detail(field string, code DetailCode, message string) oapi.ErrorDetail {
	return oapi.ErrorDetail{Field: &field, Code: code, Message: message}
}
