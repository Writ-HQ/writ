-- +goose Up

-- Authentication calls provision_user on every request, with whatever
-- profile claims the access token happens to carry. Two things follow.
--
-- The email address may be unknown. An access token often has no email
-- claim, and the API only trusts an address the identity provider has
-- verified. NULL means "not known yet"; an empty string is still refused.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- The common case is now a user who already exists, so the function looks
-- first and only writes on a first login. Everything else about it is as
-- described in migration 00006: it is the one path around the users
-- policies, it matches one exact external_auth_id, and it never changes an
-- existing row.
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
	-- No identifier, no row: the same answer as a missing setting.
	IF p_external_auth_id IS NULL OR p_external_auth_id = '' THEN
		RETURN;
	END IF;

	PERFORM set_config('app.provisioning_external_auth_id', p_external_auth_id, true);

	RETURN QUERY
		SELECT u.* FROM public.users u
		WHERE u.external_auth_id = p_external_auth_id;

	IF NOT FOUND THEN
		-- Two first requests can race; the loser's insert does nothing
		-- and the query below returns the winner's row.
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

	INSERT INTO public.users (external_auth_id, email, display_name, locale)
	VALUES (p_external_auth_id, p_email, p_display_name, p_locale)
	ON CONFLICT (external_auth_id) DO NOTHING;

	RETURN QUERY
		SELECT u.* FROM public.users u
		WHERE u.external_auth_id = p_external_auth_id;

	PERFORM set_config('app.provisioning_external_auth_id', '', true);
END
$$;
-- +goose StatementEnd

-- Fails if any user has no email; give those rows an address first.
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
