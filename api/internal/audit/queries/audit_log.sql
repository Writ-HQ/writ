-- Every query here must run inside database.WithTenant. There are no
-- UPDATE or DELETE queries, and there must never be: audit_log is
-- append-only.

-- name: InsertAuditEvent :one
INSERT INTO audit_log (tenant_id, actor_user_id, action, entity_type, entity_id, metadata, ip)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: ListAuditEvents :many
SELECT * FROM audit_log
ORDER BY created_at DESC, id DESC
LIMIT $1;
