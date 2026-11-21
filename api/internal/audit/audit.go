// Package audit records sensitive actions in audit_log, the append-only,
// per-tenant record that this module owns. Other modules do not write to
// the table; they call Record.
package audit

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/Writ-HQ/writ/api/internal/audit/auditdb"
)

// Event is one sensitive action.
type Event struct {
	// TenantID is the tenant the action happened in. It must be the
	// tenant of the transaction the event is recorded in; row-level
	// security rejects anything else.
	TenantID uuid.UUID
	// ActorUserID is who did it; the zero UUID for the system.
	ActorUserID uuid.UUID
	// Action names what happened, as "entity.verb": "tenant.created".
	Action string
	// EntityType and EntityID identify what it happened to.
	EntityType string
	EntityID   uuid.UUID
	// Metadata is extra detail, as a JSON object. It must not contain
	// personal data: say which fields changed, not what they changed to.
	Metadata map[string]any
}

// Record writes the event inside tx, which must come from
// database.WithTenant for the event's tenant. Recording in the caller's
// transaction is the point: the event and the change it describes commit
// or roll back together, so there is never one without the other.
func Record(ctx context.Context, tx pgx.Tx, e Event) error {
	if e.TenantID == uuid.Nil || e.Action == "" || e.EntityType == "" {
		return errors.New("audit: an event needs a tenant, an action and an entity type")
	}
	metadata := json.RawMessage(`{}`)
	if len(e.Metadata) > 0 {
		encoded, err := json.Marshal(e.Metadata)
		if err != nil {
			return fmt.Errorf("audit: encoding the metadata: %w", err)
		}
		metadata = encoded
	}
	_, err := auditdb.New(tx).InsertAuditEvent(ctx, auditdb.InsertAuditEventParams{
		TenantID:    e.TenantID,
		ActorUserID: uuid.NullUUID{UUID: e.ActorUserID, Valid: e.ActorUserID != uuid.Nil},
		Action:      e.Action,
		EntityType:  e.EntityType,
		EntityID:    uuid.NullUUID{UUID: e.EntityID, Valid: e.EntityID != uuid.Nil},
		Metadata:    metadata,
	})
	if err != nil {
		return fmt.Errorf("audit: recording %s: %w", e.Action, err)
	}
	return nil
}
