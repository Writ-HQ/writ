-- tenants is under row-level security: a transaction sees the current
-- tenant and the tenants the current user is an active member of. Nothing
-- here works around that; each query says which helper it runs inside.

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

-- ResolveTenantForCurrentUser is the membership check behind every
-- tenant-scoped request. It runs inside database.WithUser, before the
-- tenant is trusted, and returns a row only when the current user is an
-- active member of a tenant that has not been deleted. No row means "not
-- found", whatever the reason.
--
-- The membership conditions repeat what the tenants_member_select policy
-- already enforces: a user-only transaction cannot see a tenant without an
-- active, undeleted membership. They are written out so that this check
-- does not rest on the policy alone, and the policy does not rest on it.
-- The deleted-tenant condition is not in any policy and is enforced here
-- only.
-- name: ResolveTenantForCurrentUser :one
SELECT sqlc.embed(t), m.role
FROM tenants t
JOIN memberships m ON m.tenant_id = t.id
WHERE t.id = $1
  AND m.user_id = current_user_id()
  AND m.status = 'active'
  AND m.deleted_at IS NULL
  AND t.deleted_at IS NULL;

-- ListTenantsForCurrentUser runs inside database.WithUser, before a tenant
-- is chosen. Oldest first: ids are UUIDv7, so id order is creation order,
-- and the id is the cursor. Pass the zero UUID for the first page.
-- name: ListTenantsForCurrentUser :many
SELECT sqlc.embed(t), m.role
FROM tenants t
JOIN memberships m ON m.tenant_id = t.id
WHERE m.user_id = current_user_id()
  AND m.status = 'active'
  AND m.deleted_at IS NULL
  AND t.deleted_at IS NULL
  AND t.id > sqlc.arg(after)
ORDER BY t.id
LIMIT sqlc.arg(page_size);

-- UpdateTenant runs inside database.WithTenant. A NULL argument leaves
-- that column as it is.
-- name: UpdateTenant :one
UPDATE tenants
SET name           = COALESCE(sqlc.narg(name), name),
    default_locale = COALESCE(sqlc.narg(default_locale), default_locale)
WHERE id = current_tenant_id() AND deleted_at IS NULL
RETURNING *;

-- name: UpdateTenantName :execrows
UPDATE tenants
SET name = $2
WHERE id = $1 AND deleted_at IS NULL;
