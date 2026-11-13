-- +goose Up

-- The application's own way to shut an account out. An access token stays
-- valid until it expires, whatever happens to the user in the identity
-- provider in the meantime, so disabling someone there does not stop
-- requests already holding a token. The API checks this column on every
-- request and refuses a user whose disabled_at is set.
--
-- The API role cannot change it: writ_app has UPDATE on named columns of
-- users only, and this is not one of them, so a user cannot re-enable
-- themselves. Until admin tooling exists it is set by an operator, as
-- writ_owner, acting for the user in question:
--
--   BEGIN;
--   SELECT set_config('app.user_id', '<user id>', true);
--   UPDATE users SET disabled_at = now() WHERE id = '<user id>';
--   COMMIT;
--
-- and cleared the same way with disabled_at = NULL.
ALTER TABLE users ADD COLUMN disabled_at timestamptz;

ALTER TABLE security_events DROP CONSTRAINT security_events_event_type_check;
ALTER TABLE security_events ADD CONSTRAINT security_events_event_type_check
	CHECK (event_type IN (
		'user.provisioned',
		'profile.email_changed',
		'auth.mfa_required',
		'account.disabled',
		'account.enabled'
	));

-- Every change of disabled_at leaves a security event, in the same
-- transaction, whoever makes the change and however: there is no way to
-- disable or re-enable an account quietly. The function runs with the
-- rights of whoever updates the row, so the event passes the ordinary
-- security_events policy: the update must be made for that user, as in
-- the statements above.
-- +goose StatementBegin
CREATE FUNCTION users_record_disabled_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	INSERT INTO security_events (user_id, event_type)
	VALUES (NEW.id, CASE WHEN NEW.disabled_at IS NULL THEN 'account.enabled' ELSE 'account.disabled' END);
	RETURN NULL;
END
$$;
-- +goose StatementEnd

-- Only when the account goes from enabled to disabled or back; moving the
-- timestamp of an already disabled account is not a new event.
CREATE TRIGGER users_record_disabled_change
	AFTER UPDATE OF disabled_at ON users
	FOR EACH ROW
	WHEN ((OLD.disabled_at IS NULL) <> (NEW.disabled_at IS NULL))
	EXECUTE FUNCTION users_record_disabled_change();

-- +goose Down
DROP TRIGGER users_record_disabled_change ON users;
DROP FUNCTION users_record_disabled_change();

-- Fails while account.disabled or account.enabled events exist; they are
-- append-only and cannot be removed to make way for this.
ALTER TABLE security_events DROP CONSTRAINT security_events_event_type_check;
ALTER TABLE security_events ADD CONSTRAINT security_events_event_type_check
	CHECK (event_type IN (
		'user.provisioned',
		'profile.email_changed',
		'auth.mfa_required'
	));

ALTER TABLE users DROP COLUMN disabled_at;
