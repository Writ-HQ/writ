package httpserver

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/Writ-HQ/writ/api/internal/apierror"
	"github.com/Writ-HQ/writ/api/internal/oapi"
)

// WriteError writes an error response that follows the Error schema. The
// message is for developers and must never contain personal data.
func WriteError(w http.ResponseWriter, r *http.Request, status int, code apierror.Code, message string, details ...oapi.ErrorDetail) {
	body := oapi.Error{
		Code:      code,
		Message:   message,
		RequestId: RequestIDFromContext(r.Context()),
	}
	if len(details) > 0 {
		body.Details = &details
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	// An encoding failure here means the client has gone away.
	_ = json.NewEncoder(w).Encode(body)
}

func notFound(w http.ResponseWriter, r *http.Request) {
	WriteError(w, r, http.StatusNotFound, apierror.NotFound, "The resource was not found.")
}

func methodNotAllowed(w http.ResponseWriter, r *http.Request) {
	WriteError(w, r, http.StatusMethodNotAllowed, apierror.MethodNotAllowed, "The method is not allowed for this resource.")
}

// requestError handles requests the generated code could not decode: bad
// parameters or a malformed body. The underlying error may quote the
// submitted value, so it is neither logged nor returned; only the name of
// the offending parameter is.
func requestError(w http.ResponseWriter, r *http.Request, err error) {
	var details []oapi.ErrorDetail
	if name := paramName(err); name != "" {
		details = append(details, oapi.ErrorDetail{
			Field:   &name,
			Code:    apierror.DetailInvalid,
			Message: "The parameter is missing or invalid.",
		})
	}
	WriteError(w, r, http.StatusBadRequest, apierror.BadRequest, "The request is malformed.", details...)
}

// responseError handles errors returned by handlers. Handlers return typed
// responses for expected failures, so an error here is unexpected.
func responseError(logger *slog.Logger) func(http.ResponseWriter, *http.Request, error) {
	return func(w http.ResponseWriter, r *http.Request, err error) {
		logger.ErrorContext(r.Context(), "handler failed",
			slog.String("request_id", RequestIDFromContext(r.Context())),
			slog.Any("error", err),
		)
		WriteError(w, r, http.StatusInternalServerError, apierror.InternalError, "An unexpected error occurred.")
	}
}

func paramName(err error) string {
	var (
		invalidFormat *oapi.InvalidParamFormatError
		required      *oapi.RequiredParamError
		requiredHdr   *oapi.RequiredHeaderError
		tooMany       *oapi.TooManyValuesForParamError
		unmarshal     *oapi.UnmarshalingParamError
		cookie        *oapi.UnescapedCookieParamError
	)
	switch {
	case errors.As(err, &invalidFormat):
		return invalidFormat.ParamName
	case errors.As(err, &required):
		return required.ParamName
	case errors.As(err, &requiredHdr):
		return requiredHdr.ParamName
	case errors.As(err, &tooMany):
		return tooMany.ParamName
	case errors.As(err, &unmarshal):
		return unmarshal.ParamName
	case errors.As(err, &cookie):
		return cookie.ParamName
	}
	return ""
}
