-- +goose Up

-- The roles are created outside of migrations (see db/initdb/01-roles.sh),
-- because roles are cluster-wide and carry passwords. Fail early with a
-- clear message if the application role is missing.
-- +goose StatementBegin
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'writ_app') THEN
		RAISE EXCEPTION 'role writ_app does not exist; create the database roles before migrating';
	END IF;
END
$$;
-- +goose StatementEnd

GRANT USAGE ON SCHEMA public TO writ_app;

-- Keeps updated_at current. Attach to every table that has the column.
-- +goose StatementBegin
CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END
$$;
-- +goose StatementEnd

-- The tenant the current transaction acts for, or NULL when none is set.
-- Row-level security policies compare tenant_id to this. It is set with
-- SET LOCAL by the tenant transaction helper in Go. After such a
-- transaction ends the setting reverts to an empty string rather than
-- NULL, hence NULLIF: both "never set" and "set earlier on this pooled
-- connection" must match no rows.
-- +goose StatementBegin
CREATE FUNCTION current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE AS $$
	SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;
-- +goose StatementEnd

-- +goose Down
DROP FUNCTION current_tenant_id();
DROP FUNCTION set_updated_at();
REVOKE USAGE ON SCHEMA public FROM writ_app;
