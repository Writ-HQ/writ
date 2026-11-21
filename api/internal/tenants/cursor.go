package tenants

import (
	"encoding/base64"

	"github.com/google/uuid"
)

// A cursor is the id of the last tenant on the previous page, encoded so
// that clients treat it as opaque. It reveals nothing the client was not
// already given, and a forged one can only skip the caller's own tenants:
// the query still returns nothing the caller is not a member of.

func encodeCursor(id uuid.UUID) string {
	return base64.RawURLEncoding.EncodeToString(id[:])
}

// decodeCursor returns the zero UUID, which sorts before every real id,
// for the empty cursor of a first page.
func decodeCursor(cursor string) (uuid.UUID, error) {
	if cursor == "" {
		return uuid.Nil, nil
	}
	raw, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return uuid.Nil, ErrInvalidCursor
	}
	id, err := uuid.FromBytes(raw)
	if err != nil || id == uuid.Nil {
		return uuid.Nil, ErrInvalidCursor
	}
	return id, nil
}
