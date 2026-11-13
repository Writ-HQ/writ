-- security_events is append-only and scoped to one user by row-level
-- security. Every query here runs inside database.WithUser (or
-- WithTenant). There are no UPDATE or DELETE queries, and there must never
-- be. metadata must not contain personal data.

-- name: InsertSecurityEvent :one
INSERT INTO security_events (user_id, event_type, metadata)
VALUES (current_user_id(), $1, $2)
RETURNING *;

-- name: ListSecurityEventsForCurrentUser :many
SELECT * FROM security_events
ORDER BY created_at DESC, id DESC
LIMIT $1;
