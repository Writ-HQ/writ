-- Every query here must run inside database.WithTenant. Row-level security
-- restricts them to the current tenant; they deliberately do not filter by
-- tenant_id themselves, so a missing tenant context returns nothing rather
-- than the wrong tenant's rows.

-- name: CreateMembership :one
INSERT INTO memberships (tenant_id, user_id, role, status)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetMembership :one
SELECT * FROM memberships
WHERE id = $1 AND deleted_at IS NULL;

-- name: ListMemberships :many
SELECT * FROM memberships
WHERE deleted_at IS NULL
ORDER BY id;

-- name: UpdateMembershipRole :execrows
UPDATE memberships
SET role = $2
WHERE id = $1 AND deleted_at IS NULL;

-- name: SoftDeleteMembership :execrows
UPDATE memberships
SET deleted_at = now()
WHERE id = $1 AND deleted_at IS NULL;
