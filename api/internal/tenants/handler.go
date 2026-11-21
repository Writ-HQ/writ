package tenants

import (
	"context"
	"errors"

	openapi_types "github.com/oapi-codegen/runtime/types"

	"github.com/Writ-HQ/writ/api/internal/apierror"
	"github.com/Writ-HQ/writ/api/internal/auth"
	"github.com/Writ-HQ/writ/api/internal/oapi"
)

// Handler implements the tenant operations of oapi.StrictServerInterface.
//
// Expected failures are returned as typed responses with the standard
// error body, built by apierror.New so that it carries the request ID.
type Handler struct {
	service *Service
}

// NewHandler returns a Handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

var errNoUser = errors.New("tenants: handler reached without an authenticated user")

// errNoMembership means a tenant-scoped handler ran without the tenant
// context middleware having run first. That is a wiring mistake, and it
// fails closed with a 500 rather than serving the request.
var errNoMembership = errors.New("tenants: handler reached without a resolved tenant")

// ListTenants lists the caller's tenants.
func (h *Handler) ListTenants(ctx context.Context, req oapi.ListTenantsRequestObject) (oapi.ListTenantsResponseObject, error) {
	user, ok := auth.UserFromContext(ctx)
	if !ok {
		return nil, errNoUser
	}
	cursor, limit := "", 0
	if req.Params.Cursor != nil {
		cursor = *req.Params.Cursor
	}
	if req.Params.Limit != nil {
		limit = int(*req.Params.Limit)
		// An explicit limit must be in range; only an absent one means
		// the default.
		if limit < 1 {
			limit = -1
		}
	}
	if limit < 0 || limit > MaxPageSize {
		return oapi.ListTenants400JSONResponse{BadRequestJSONResponse: oapi.BadRequestJSONResponse(invalidParam(ctx, "limit"))}, nil
	}

	page, next, err := h.service.List(ctx, user, cursor, limit)
	if errors.Is(err, ErrInvalidCursor) {
		return oapi.ListTenants400JSONResponse{BadRequestJSONResponse: oapi.BadRequestJSONResponse(
			apierror.New(ctx, apierror.InvalidCursor, "The cursor is not valid for this request."))}, nil
	}
	if err != nil {
		return nil, err
	}

	out := oapi.TenantList{Data: make([]oapi.Tenant, len(page))}
	for i, m := range page {
		out.Data[i] = toAPI(m)
	}
	if next != "" {
		out.Page.NextCursor = &next
	}
	return oapi.ListTenants200JSONResponse(out), nil
}

// CreateTenant creates a tenant owned by the caller.
func (h *Handler) CreateTenant(ctx context.Context, req oapi.CreateTenantRequestObject) (oapi.CreateTenantResponseObject, error) {
	user, ok := auth.UserFromContext(ctx)
	if !ok {
		return nil, errNoUser
	}
	// Permission before validation: someone who may not create tenants
	// learns nothing about what a valid request looks like.
	if !h.service.CanCreate(user) {
		return oapi.CreateTenant403JSONResponse{ForbiddenJSONResponse: oapi.ForbiddenJSONResponse(forbidden(ctx))}, nil
	}
	if req.Body == nil {
		return oapi.CreateTenant422JSONResponse{ValidationFailedJSONResponse: oapi.ValidationFailedJSONResponse(
			validationFailed(ctx, &InvalidError{Field: "name", Required: true, Message: "name is required."}))}, nil
	}
	locale := ""
	if req.Body.DefaultLocale != nil {
		locale = string(*req.Body.DefaultLocale)
	}

	m, err := h.service.Create(ctx, user, req.Body.Name, locale)
	var invalid *InvalidError
	switch {
	case errors.As(err, &invalid):
		return oapi.CreateTenant422JSONResponse{ValidationFailedJSONResponse: oapi.ValidationFailedJSONResponse(validationFailed(ctx, invalid))}, nil
	case errors.Is(err, ErrForbidden):
		return oapi.CreateTenant403JSONResponse{ForbiddenJSONResponse: oapi.ForbiddenJSONResponse(forbidden(ctx))}, nil
	case err != nil:
		return nil, err
	}
	return oapi.CreateTenant201JSONResponse(toAPI(m)), nil
}

// GetTenant returns the request's tenant. The membership check has
// already happened; any member may read.
func (h *Handler) GetTenant(ctx context.Context, _ oapi.GetTenantRequestObject) (oapi.GetTenantResponseObject, error) {
	m, ok := MembershipFromContext(ctx)
	if !ok {
		return nil, errNoMembership
	}
	if !m.Role.Can(TenantRead) {
		// No role lacks this today. If one ever does, it must not be
		// told the tenant exists.
		return oapi.GetTenant404JSONResponse{NotFoundJSONResponse: oapi.NotFoundJSONResponse(notFound(ctx))}, nil
	}
	return oapi.GetTenant200JSONResponse(toAPI(m)), nil
}

// UpdateTenant changes the request's tenant.
func (h *Handler) UpdateTenant(ctx context.Context, req oapi.UpdateTenantRequestObject) (oapi.UpdateTenantResponseObject, error) {
	user, ok := auth.UserFromContext(ctx)
	if !ok {
		return nil, errNoUser
	}
	m, ok := MembershipFromContext(ctx)
	if !ok {
		return nil, errNoMembership
	}
	// Permission before validation, as above.
	if !m.Role.Can(TenantUpdate) {
		return oapi.UpdateTenant403JSONResponse{ForbiddenJSONResponse: oapi.ForbiddenJSONResponse(forbidden(ctx))}, nil
	}

	var name, locale *string
	if req.Body != nil {
		name = req.Body.Name
		if req.Body.DefaultLocale != nil {
			v := string(*req.Body.DefaultLocale)
			locale = &v
		}
	}

	updated, err := h.service.Update(ctx, user, m, name, locale)
	var invalid *InvalidError
	switch {
	case errors.As(err, &invalid):
		return oapi.UpdateTenant422JSONResponse{ValidationFailedJSONResponse: oapi.ValidationFailedJSONResponse(validationFailed(ctx, invalid))}, nil
	case errors.Is(err, ErrForbidden):
		return oapi.UpdateTenant403JSONResponse{ForbiddenJSONResponse: oapi.ForbiddenJSONResponse(forbidden(ctx))}, nil
	case errors.Is(err, ErrNotFound):
		return oapi.UpdateTenant404JSONResponse{NotFoundJSONResponse: oapi.NotFoundJSONResponse(notFound(ctx))}, nil
	case err != nil:
		return nil, err
	}
	return oapi.UpdateTenant200JSONResponse(toAPI(updated)), nil
}

func toAPI(m Membership) oapi.Tenant {
	return oapi.Tenant{
		Id:            openapi_types.UUID(m.Tenant.ID),
		Name:          m.Tenant.Name,
		Slug:          m.Tenant.Slug,
		DefaultLocale: oapi.Locale(m.Tenant.DefaultLocale),
		Role:          oapi.Role(m.Role),
		// The contract says timestamps are in UTC; the database driver
		// returns them in the server's zone.
		CreatedAt: m.Tenant.CreatedAt.UTC(),
		UpdatedAt: m.Tenant.UpdatedAt.UTC(),
	}
}

func notFound(ctx context.Context) oapi.Error {
	return apierror.New(ctx, apierror.NotFound, "The resource was not found.")
}

func forbidden(ctx context.Context) oapi.Error {
	return apierror.New(ctx, apierror.PermissionDenied, "The caller is not allowed to perform this action.")
}

func invalidParam(ctx context.Context, name string) oapi.Error {
	return apierror.New(ctx, apierror.BadRequest, "The request is malformed.",
		apierror.Detail(name, apierror.DetailInvalid, "The parameter is missing or invalid."))
}

func validationFailed(ctx context.Context, e *InvalidError) oapi.Error {
	code := apierror.DetailInvalid
	if e.Required {
		code = apierror.DetailRequired
	}
	return apierror.New(ctx, apierror.ValidationFailed, "The request body is invalid.",
		apierror.Detail(e.Field, code, e.Message))
}
