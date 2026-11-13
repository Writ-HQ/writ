-- +goose Up

-- When the user's profile (email, name, locale) was last copied from the
-- identity provider's userinfo endpoint. NULL means never: the user has
-- only just been seen. The API refreshes a profile older than 24 hours.
ALTER TABLE users ADD COLUMN profile_synced_at timestamptz;
GRANT UPDATE (profile_synced_at) ON users TO writ_app;

-- Owned by the auth module. Security-relevant things that happened to one
-- user's account, visible to that user and nobody else. It is not the
-- record of sign-ins: the identity provider is the system of record for
-- those. It is also not audit_log, which belongs to a tenant; these events
-- happen before any tenant is chosen.
--
-- Append-only, like audit_log, and for that reason without updated_at or
-- deleted_at. metadata must not hold personal data such as addresses.
CREATE TABLE security_events (
	id         uuid PRIMARY KEY DEFAULT uuidv7(),
	user_id    uuid NOT NULL REFERENCES users (id),
	event_type text NOT NULL CHECK (event_type IN (
		'user.provisioned',
		'profile.email_changed',
		'auth.mfa_required'
	)),
	metadata   jsonb NOT NULL DEFAULT '{}',
	created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX security_events_user_id_created_at_idx ON security_events (user_id, created_at DESC, id DESC);

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events FORCE ROW LEVEL SECURITY;

-- Keyed on the user, not the tenant. SELECT and INSERT only, so row-level
-- security also rejects UPDATE and DELETE.
CREATE POLICY security_events_own_select ON security_events
	FOR SELECT USING (user_id = current_user_id());
CREATE POLICY security_events_own_insert ON security_events
	FOR INSERT WITH CHECK (user_id = current_user_id());

GRANT SELECT, INSERT ON security_events TO writ_app;
REVOKE UPDATE, DELETE, TRUNCATE ON security_events FROM writ_app;

-- +goose StatementBegin
CREATE FUNCTION security_events_reject_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'security_events is append-only'
		USING ERRCODE = 'insufficient_privilege';
END
$$;
-- +goose StatementEnd

CREATE TRIGGER security_events_no_update_or_delete
	BEFORE UPDATE OR DELETE ON security_events
	FOR EACH ROW EXECUTE FUNCTION security_events_reject_change();

CREATE TRIGGER security_events_no_truncate
	BEFORE TRUNCATE ON security_events
	FOR EACH STATEMENT EXECUTE FUNCTION security_events_reject_change();

-- provision_user now also records that it created a user, in the same
-- transaction as the insert, so the event cannot be missed or forged by
-- the API. It writes the event as the new user: it sets app.user_id for
-- that one statement and then puts back whatever was there. Everything
-- else is as described in migrations 00006 and 00007.
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION provision_user(
	p_external_auth_id text,
	p_email            text,
	p_display_name     text,
	p_locale           text
) RETURNS SETOF users
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
	v_user          public.users;
	v_previous_user text;
BEGIN
	-- No identifier, no row: the same answer as a missing setting.
	IF p_external_auth_id IS NULL OR p_external_auth_id = '' THEN
		RETURN;
	END IF;

	PERFORM set_config('app.provisioning_external_auth_id', p_external_auth_id, true);

	SELECT u.* INTO v_user FROM public.users u
	WHERE u.external_auth_id = p_external_auth_id;

	IF NOT FOUND THEN
		INSERT INTO public.users (external_auth_id, email, display_name, locale)
		VALUES (p_external_auth_id, NULLIF(p_email, ''), COALESCE(p_display_name, ''), COALESCE(p_locale, 'en'))
		ON CONFLICT (external_auth_id) DO NOTHING
		RETURNING * INTO v_user;

		IF FOUND THEN
			v_previous_user := current_setting('app.user_id', true);
			PERFORM set_config('app.user_id', v_user.id::text, true);
			INSERT INTO public.security_events (user_id, event_type)
			VALUES (v_user.id, 'user.provisioned');
			PERFORM set_config('app.user_id', COALESCE(v_previous_user, ''), true);
		ELSE
			-- Two first requests raced and the other one won.
			SELECT u.* INTO v_user FROM public.users u
			WHERE u.external_auth_id = p_external_auth_id;
		END IF;
	END IF;

	PERFORM set_config('app.provisioning_external_auth_id', '', true);

	IF v_user.id IS NOT NULL THEN
		RETURN NEXT v_user;
	END IF;
END
$$;
-- +goose StatementEnd

-- +goose Down

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION provision_user(
	p_external_auth_id text,
	p_email            text,
	p_display_name     text,
	p_locale           text
) RETURNS SETOF users
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
	IF p_external_auth_id IS NULL OR p_external_auth_id = '' THEN
		RETURN;
	END IF;

	PERFORM set_config('app.provisioning_external_auth_id', p_external_auth_id, true);

	RETURN QUERY
		SELECT u.* FROM public.users u
		WHERE u.external_auth_id = p_external_auth_id;

	IF NOT FOUND THEN
		INSERT INTO public.users (external_auth_id, email, display_name, locale)
		VALUES (p_external_auth_id, NULLIF(p_email, ''), COALESCE(p_display_name, ''), COALESCE(p_locale, 'en'))
		ON CONFLICT (external_auth_id) DO NOTHING;

		RETURN QUERY
			SELECT u.* FROM public.users u
			WHERE u.external_auth_id = p_external_auth_id;
	END IF;

	PERFORM set_config('app.provisioning_external_auth_id', '', true);
END
$$;
-- +goose StatementEnd

DROP TABLE security_events;
DROP FUNCTION security_events_reject_change();

REVOKE UPDATE (profile_synced_at) ON users FROM writ_app;
ALTER TABLE users DROP COLUMN profile_synced_at;
