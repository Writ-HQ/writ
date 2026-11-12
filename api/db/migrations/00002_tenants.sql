-- +goose Up

-- Owned by the tenants module. One row per customer.
CREATE TABLE tenants (
	id             uuid PRIMARY KEY DEFAULT uuidv7(),
	name           text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
	slug           text NOT NULL CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'),
	default_locale text NOT NULL DEFAULT 'en' CHECK (default_locale IN ('en', 'fr')),
	created_at     timestamptz NOT NULL DEFAULT now(),
	updated_at     timestamptz NOT NULL DEFAULT now(),
	deleted_at     timestamptz,
	CONSTRAINT tenants_slug_key UNIQUE (slug)
);

CREATE TRIGGER tenants_set_updated_at
	BEFORE UPDATE ON tenants
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- No DELETE: rows are soft-deleted with deleted_at.
GRANT SELECT, INSERT, UPDATE ON tenants TO writ_app;

-- +goose Down
DROP TABLE tenants;
