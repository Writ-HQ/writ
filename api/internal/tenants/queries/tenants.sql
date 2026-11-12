-- tenants is under row-level security: a transaction sees the current
-- tenant and the tenants the current user is an active member of.

-- CreateTenant must run inside database.WithTenant with the new tenant's
-- id, chosen by the caller, as the tenant. Otherwise the new row is not
-- visible to RETURNING and the first membership cannot be added.
-- name: CreateTenant :one
INSERT INTO tenants (id, name, slug, default_locale)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetTenant :one
SELECT * FROM tenants
WHERE id = $1 AND deleted_at IS NULL;

-- ListTenantsForCurrentUser runs inside database.WithUser, before a tenant
-- is chosen.
-- name: ListTenantsForCurrentUser :many
SELECT t.* FROM tenants t
JOIN memberships m ON m.tenant_id = t.id
WHERE m.user_id = current_user_id()
  AND m.status = 'active'
  AND m.deleted_at IS NULL
  AND t.deleted_at IS NULL
ORDER BY t.name, t.id;

-- name: UpdateTenantName :execrows
UPDATE tenants
SET name = $2
WHERE id = $1 AND deleted_at IS NULL;
