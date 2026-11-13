-- users is under row-level security. Apart from ProvisionUser, every query
-- here must run inside database.WithUser or database.WithTenant.

-- ProvisionUser finds or creates the user for an identity provider subject
-- at login. It calls the provision_user database function, the one path
-- that is not subject to the users policies (see migration 00006), so it
-- needs no user context. Pass an external_auth_id from a verified token
-- only. An existing user is returned unchanged. email is NULL when the
-- address is not known.
-- name: ProvisionUser :one
SELECT * FROM provision_user(
	sqlc.arg(external_auth_id),
	sqlc.narg(email),
	sqlc.arg(display_name),
	sqlc.arg(locale)
);

-- GetUser returns the caller's own row, or a member of the current tenant.
-- name: GetUser :one
SELECT * FROM users
WHERE id = $1;

-- UpdateCurrentUserProfile changes the caller's own row; row-level security
-- allows no other.
-- name: UpdateCurrentUserProfile :execrows
UPDATE users
SET display_name = $1, locale = $2
WHERE id = current_user_id();

-- SyncCurrentUserProfile stores what the identity provider's userinfo
-- endpoint returned and marks the profile as fresh. A NULL argument leaves
-- that column as it is. Runs inside database.WithUser.
-- name: SyncCurrentUserProfile :one
UPDATE users
SET email             = COALESCE(sqlc.narg(email), email),
    display_name      = COALESCE(sqlc.narg(display_name), display_name),
    locale            = COALESCE(sqlc.narg(locale), locale),
    profile_synced_at = now()
WHERE id = current_user_id()
RETURNING *;
