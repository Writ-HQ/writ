-- users is under row-level security. Apart from ProvisionUser, every query
-- here must run inside database.WithUser or database.WithTenant.

-- ProvisionUser finds or creates the user for an identity provider subject
-- at login. It calls the provision_user database function, the one path
-- that is not subject to the users policies (see migration 00006), so it
-- needs no user context. Pass an external_auth_id from a verified token
-- only. An existing user is returned unchanged.
-- name: ProvisionUser :one
SELECT * FROM provision_user(
	sqlc.arg(external_auth_id),
	sqlc.arg(email),
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
