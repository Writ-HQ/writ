-- +goose Up

-- Owned by the tenants module. Links a user to a tenant with a role.
CREATE TABLE memberships (
	id         uuid PRIMARY KEY DEFAULT uuidv7(),
	tenant_id  uuid NOT NULL REFERENCES tenants (id),
	user_id    uuid NOT NULL REFERENCES users (id),
	role       text NOT NULL CHECK (role IN ('owner', 'admin', 'staff', 'volunteer')),
	status     text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended')),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	deleted_at timestamptz,
	CONSTRAINT memberships_tenant_id_user_id_key UNIQUE (tenant_id, user_id)
);

CREATE INDEX memberships_user_id_idx ON memberships (user_id);

CREATE TRIGGER memberships_set_updated_at
	BEFORE UPDATE ON memberships
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- FORCE makes the policy apply to the table owner as well.
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;

CREATE POLICY memberships_tenant_isolation ON memberships
	USING (tenant_id = current_tenant_id())
	WITH CHECK (tenant_id = current_tenant_id());

-- No DELETE: rows are soft-deleted with deleted_at.
GRANT SELECT, INSERT, UPDATE ON memberships TO writ_app;

-- +goose Down
DROP TABLE memberships;
