-- +goose Up

-- Owned by the auth module. Global, not tenant-scoped: one person can
-- belong to several tenants through memberships. The identity provider is
-- the source of truth; external_auth_id is its subject identifier.
CREATE TABLE users (
	id               uuid PRIMARY KEY DEFAULT uuidv7(),
	external_auth_id text NOT NULL CHECK (external_auth_id <> ''),
	email            text NOT NULL CHECK (email <> ''),
	display_name     text NOT NULL DEFAULT '',
	locale           text NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'fr')),
	created_at       timestamptz NOT NULL DEFAULT now(),
	updated_at       timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT users_external_auth_id_key UNIQUE (external_auth_id)
);

CREATE TRIGGER users_set_updated_at
	BEFORE UPDATE ON users
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

GRANT SELECT, INSERT, UPDATE ON users TO writ_app;

-- +goose Down
DROP TABLE users;
