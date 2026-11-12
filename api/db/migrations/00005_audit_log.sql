-- +goose Up

-- Owned by the audit module. Append-only record of sensitive actions.
-- It has no updated_at or deleted_at because rows never change.
CREATE TABLE audit_log (
	id            uuid PRIMARY KEY DEFAULT uuidv7(),
	tenant_id     uuid NOT NULL REFERENCES tenants (id),
	-- NULL when the system, not a person, performed the action.
	actor_user_id uuid REFERENCES users (id),
	action        text NOT NULL CHECK (action <> ''),
	entity_type   text NOT NULL CHECK (entity_type <> ''),
	entity_id     uuid,
	metadata      jsonb NOT NULL DEFAULT '{}',
	ip            inet,
	created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_tenant_id_created_at_idx ON audit_log (tenant_id, created_at DESC, id DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

-- Policies exist for SELECT and INSERT only, so row-level security also
-- rejects UPDATE and DELETE for every role it applies to.
CREATE POLICY audit_log_tenant_select ON audit_log
	FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY audit_log_tenant_insert ON audit_log
	FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

GRANT SELECT, INSERT ON audit_log TO writ_app;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM writ_app;

-- Last line of defence: the table rejects changes from every role,
-- including its owner.
-- +goose StatementBegin
CREATE FUNCTION audit_log_reject_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'audit_log is append-only'
		USING ERRCODE = 'insufficient_privilege';
END
$$;
-- +goose StatementEnd

CREATE TRIGGER audit_log_no_update_or_delete
	BEFORE UPDATE OR DELETE ON audit_log
	FOR EACH ROW EXECUTE FUNCTION audit_log_reject_change();

CREATE TRIGGER audit_log_no_truncate
	BEFORE TRUNCATE ON audit_log
	FOR EACH STATEMENT EXECUTE FUNCTION audit_log_reject_change();

-- +goose Down
DROP TABLE audit_log;
DROP FUNCTION audit_log_reject_change();
