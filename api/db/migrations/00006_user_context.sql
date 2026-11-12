-- +goose Up

-- Adds a second transaction-local setting, app.user_id, and puts tenants
-- and users under row-level security. After this migration no table is
-- readable without a tenant or a user context.
--
-- Policies may read memberships, and memberships policies read no table.
-- Keep it that way: a memberships policy that read tenants or users would
-- make the policies reference each other, which PostgreSQL rejects at
-- query time as infinite recursion.

-- The user the current transaction acts for, or NULL when none is set.
-- Same rules as current_tenant_id(): "never set" and the empty string a
-- pooled connection reports afterwards both mean nobody.
-- +goose StatementBegin
CREATE FUNCTION current_user_id() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE AS $$
	SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;
-- +goose StatementEnd

-- memberships: the tenant policy stays. A user can also read their own
-- memberships in every tenant, which is how "my tenants" is listed before
-- a tenant is chosen. Read only: it grants no write.
CREATE POLICY memberships_own_select ON memberships
	FOR SELECT USING (user_id = current_user_id());

-- tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

CREATE POLICY tenants_current_select ON tenants
	FOR SELECT USING (id = current_tenant_id());

CREATE POLICY tenants_current_update ON tenants
	FOR UPDATE
	USING (id = current_tenant_id())
	WITH CHECK (id = current_tenant_id());

-- The subquery runs under the memberships policies, so it can only ever
-- find the current user's own rows or the current tenant's. The user_id
-- condition is therefore implied today; it is spelled out so this policy
-- stays correct if the memberships policies change.
CREATE POLICY tenants_member_select ON tenants
	FOR SELECT USING (
		EXISTS (
			SELECT 1 FROM memberships m
			WHERE m.tenant_id = tenants.id
			  AND m.user_id = current_user_id()
			  AND m.status = 'active'
			  AND m.deleted_at IS NULL
		)
	);

-- Any signed-in user may create a tenant. To read the new row back in the
-- same transaction (INSERT ... RETURNING, or adding the first membership)
-- the caller chooses the id and sets it as the current tenant.
CREATE POLICY tenants_insert ON tenants
	FOR INSERT WITH CHECK (current_user_id() IS NOT NULL);

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

CREATE POLICY users_self_select ON users
	FOR SELECT USING (id = current_user_id());

CREATE POLICY users_self_update ON users
	FOR UPDATE
	USING (id = current_user_id())
	WITH CHECK (id = current_user_id());

-- Members of the current tenant can see the other people in it, including
-- invited and suspended members but not removed ones. As above, the
-- tenant_id condition is implied by the memberships policies today and is
-- spelled out so this policy does not depend on them.
CREATE POLICY users_tenant_member_select ON users
	FOR SELECT USING (
		EXISTS (
			SELECT 1 FROM memberships m
			WHERE m.user_id = users.id
			  AND m.tenant_id = current_tenant_id()
			  AND m.deleted_at IS NULL
		)
	);

-- The API no longer inserts users directly (see provision_user below) and
-- may change only the profile columns of the caller's own row.
REVOKE INSERT, UPDATE ON users FROM writ_app;
GRANT UPDATE (email, display_name, locale) ON users TO writ_app;

-- Login provisioning.
--
-- At login the API knows only the identity provider's subject identifier.
-- There is no app.user_id yet, because the user's id is what is being
-- looked up, and on a first login there is no row at all. No policy above
-- can allow that without also letting the API read users it has no
-- business reading, so this one function runs with the owner's rights
-- (SECURITY DEFINER) instead. It is the only path around the user
-- policies, and it is kept narrow:
--
--   * It finds or creates exactly one row, by exact external_auth_id. It
--     cannot list or search, and it never changes an existing row.
--   * Row-level security is forced, so the owner is subject to it too. The
--     function gets through the users_provisioning policy below, which
--     applies only to writ_owner and only to the one row being provisioned.
--   * search_path is fixed, so nothing the caller creates can be picked up
--     in place of the objects named here.
--   * Only writ_app may execute it.
--
-- The API must pass an external_auth_id taken from a verified token, never
-- from request input.
-- +goose StatementBegin
CREATE FUNCTION provision_user(
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

REVOKE ALL ON FUNCTION provision_user(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION provision_user(text, text, text, text) TO writ_app;

-- Applies to writ_owner only, which is who provision_user runs as. Setting
-- app.provisioning_external_auth_id as writ_app has no effect.
CREATE POLICY users_provisioning ON users
	FOR ALL TO writ_owner
	USING (external_auth_id = NULLIF(current_setting('app.provisioning_external_auth_id', true), ''))
	WITH CHECK (external_auth_id = NULLIF(current_setting('app.provisioning_external_auth_id', true), ''));

-- +goose Down
DROP POLICY users_provisioning ON users;
DROP FUNCTION provision_user(text, text, text, text);

REVOKE UPDATE (email, display_name, locale) ON users FROM writ_app;
GRANT INSERT, UPDATE ON users TO writ_app;

DROP POLICY users_tenant_member_select ON users;
DROP POLICY users_self_update ON users;
DROP POLICY users_self_select ON users;
ALTER TABLE users NO FORCE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

DROP POLICY tenants_insert ON tenants;
DROP POLICY tenants_member_select ON tenants;
DROP POLICY tenants_current_update ON tenants;
DROP POLICY tenants_current_select ON tenants;
ALTER TABLE tenants NO FORCE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;

DROP POLICY memberships_own_select ON memberships;
DROP FUNCTION current_user_id();
