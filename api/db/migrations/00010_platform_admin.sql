-- +goose Up

-- A platform administrator may create tenants when the deployment does
-- not allow self-service (the pilot does not). That is all the flag does.
-- It appears in no row-level security policy, so it gives no access to
-- any tenant: reading or changing a tenant still takes a membership, for
-- a platform administrator like anyone else.
--
-- The API role cannot change it: writ_app has UPDATE on named columns of
-- users only, and this is not one of them, so nobody can promote
-- themselves through the API. It is set by an operator, as writ_owner,
-- acting for the user in question:
--
--   BEGIN;
--   SELECT set_config('app.user_id', '<user id>', true);
--   UPDATE users SET platform_admin = true WHERE id = '<user id>';
--   COMMIT;
ALTER TABLE users ADD COLUMN platform_admin boolean NOT NULL DEFAULT false;

ALTER TABLE security_events DROP CONSTRAINT security_events_event_type_check;
ALTER TABLE security_events ADD CONSTRAINT security_events_event_type_check
	CHECK (event_type IN (
		'user.provisioned',
		'profile.email_changed',
		'auth.mfa_required',
		'account.disabled',
		'account.enabled',
		'platform_admin.granted',
		'platform_admin.revoked'
	));

-- As with the kill switch, every change leaves a security event in the
-- same transaction, whoever makes it.
-- +goose StatementBegin
CREATE FUNCTION users_record_platform_admin_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	INSERT INTO security_events (user_id, event_type)
	VALUES (NEW.id, CASE WHEN NEW.platform_admin THEN 'platform_admin.granted' ELSE 'platform_admin.revoked' END);
	RETURN NULL;
END
$$;
-- +goose StatementEnd

CREATE TRIGGER users_record_platform_admin_change
	AFTER UPDATE OF platform_admin ON users
	FOR EACH ROW
	WHEN (OLD.platform_admin IS DISTINCT FROM NEW.platform_admin)
	EXECUTE FUNCTION users_record_platform_admin_change();

-- +goose Down
DROP TRIGGER users_record_platform_admin_change ON users;
DROP FUNCTION users_record_platform_admin_change();

-- Fails while platform_admin events exist; they are append-only.
ALTER TABLE security_events DROP CONSTRAINT security_events_event_type_check;
ALTER TABLE security_events ADD CONSTRAINT security_events_event_type_check
	CHECK (event_type IN (
		'user.provisioned',
		'profile.email_changed',
		'auth.mfa_required',
		'account.disabled',
		'account.enabled'
	));

ALTER TABLE users DROP COLUMN platform_admin;
