// Package apierror is the one place that names every error code the API
// returns. Handlers and middleware must use these constants rather than
// string literals or the generated names in package oapi.
//
// The source of truth is the ErrorCode and ErrorDetailCode enums in
// openapi/openapi.yaml. To add a code: add it to the enum there, run
// `make generate`, then add the constant and its entry in Codes or
// DetailCodes here. A test fails if this file and the spec disagree.
package apierror

import "github.com/Writ-HQ/writ/api/internal/oapi"

// Code is the value of the `code` field of an error response.
type Code = oapi.ErrorCode

// Error codes, with the HTTP status each is returned with.
const (
	// BadRequest: the request is malformed or a parameter is invalid (400).
	BadRequest Code = oapi.ErrorCodeBadRequest
	// InvalidCursor: the pagination cursor is not valid for this request (400).
	InvalidCursor Code = oapi.ErrorCodeInvalidCursor
	// Unauthenticated: authentication is missing or invalid (401).
	Unauthenticated Code = oapi.ErrorCodeUnauthenticated
	// AccountDisabled: the token is valid but the account has been disabled
	// in Writ (401).
	AccountDisabled Code = oapi.ErrorCodeAccountDisabled
	// MFARequired: the token is valid but was not obtained with a second
	// factor, and this deployment requires one (401).
	MFARequired Code = oapi.ErrorCodeMfaRequired
	// PermissionDenied: the caller belongs to the tenant but lacks the
	// permission (403). For a tenant the caller is not in, use NotFound.
	PermissionDenied Code = oapi.ErrorCodePermissionDenied
	// NotFound: the resource does not exist or is in another tenant (404).
	NotFound Code = oapi.ErrorCodeNotFound
	// MethodNotAllowed: the path exists but not with this method (405).
	MethodNotAllowed Code = oapi.ErrorCodeMethodNotAllowed
	// Conflict: the request conflicts with the resource's current state (409).
	Conflict Code = oapi.ErrorCodeConflict
	// ValidationFailed: the request body failed validation (422).
	ValidationFailed Code = oapi.ErrorCodeValidationFailed
	// RateLimited: the caller has sent too many requests (429).
	RateLimited Code = oapi.ErrorCodeRateLimited
	// InternalError: an unexpected server error (500).
	InternalError Code = oapi.ErrorCodeInternalError
	// ServiceUnavailable: a dependency is temporarily unavailable and the
	// request may be retried (503).
	ServiceUnavailable Code = oapi.ErrorCodeServiceUnavailable
)

// Codes lists every error code.
var Codes = []Code{
	BadRequest,
	InvalidCursor,
	Unauthenticated,
	AccountDisabled,
	MFARequired,
	PermissionDenied,
	NotFound,
	MethodNotAllowed,
	Conflict,
	ValidationFailed,
	RateLimited,
	InternalError,
	ServiceUnavailable,
}

// DetailCode is the value of the `code` field of an error detail: the reason
// one field or parameter was rejected.
type DetailCode = oapi.ErrorDetailCode

// Error detail codes.
const (
	// DetailRequired: the field or parameter is missing.
	DetailRequired DetailCode = oapi.Required
	// DetailInvalid: the field or parameter has an unacceptable value.
	DetailInvalid DetailCode = oapi.Invalid
)

// DetailCodes lists every error detail code.
var DetailCodes = []DetailCode{
	DetailRequired,
	DetailInvalid,
}
