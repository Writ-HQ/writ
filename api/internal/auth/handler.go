package auth

import (
	"context"
	"errors"

	openapi_types "github.com/oapi-codegen/runtime/types"

	"github.com/Writ-HQ/writ/api/internal/oapi"
)

// Handler implements the account operations of oapi.StrictServerInterface.
type Handler struct{}

// NewHandler returns a Handler.
func NewHandler() *Handler { return &Handler{} }

// GetMe returns the authenticated user's own account.
func (h *Handler) GetMe(ctx context.Context, _ oapi.GetMeRequestObject) (oapi.GetMeResponseObject, error) {
	user, ok := UserFromContext(ctx)
	if !ok {
		// The authentication middleware runs before every operation that
		// is not public, so this is a wiring mistake, not a client error.
		return nil, errors.New("auth: GetMe reached without an authenticated user")
	}
	return oapi.GetMe200JSONResponse{
		Id:            openapi_types.UUID(user.ID),
		Email:         user.Email,
		DisplayName:   user.DisplayName,
		Locale:        oapi.CurrentUserLocale(user.Locale),
		PlatformAdmin: user.PlatformAdmin,
	}, nil
}
