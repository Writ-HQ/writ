#!/bin/sh
# Creates the two database roles Writ uses, and hands the database to
# writ_owner. The same script runs everywhere:
#
#   * locally and in tests, once, as the bootstrap superuser, when the
#     Postgres container is first initialised;
#   * in deployed environments, as a one-off ECS task connecting as the
#     RDS admin user, which is not a superuser (see docs/runbooks).
#
# It is safe to run again: existing roles are kept and their passwords
# are reset to the values given, which is how passwords are rotated.
#
#   writ_owner  owns the schema and runs migrations. Not a superuser. Tables
#               use FORCE ROW LEVEL SECURITY, so even the owner is subject
#               to the policies.
#   writ_app    the role the API connects as. No superuser, no BYPASSRLS, no
#               DDL. It gets table privileges from the migrations.
#
# Connection settings other than the user and database (host, password,
# TLS) come from the standard PG* environment variables.
set -eu

: "${WRIT_OWNER_PASSWORD:?WRIT_OWNER_PASSWORD must be set}"
: "${WRIT_APP_PASSWORD:?WRIT_APP_PASSWORD must be set}"

psql -v ON_ERROR_STOP=1 \
	--username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
	-v owner_password="$WRIT_OWNER_PASSWORD" \
	-v app_password="$WRIT_APP_PASSWORD" <<'EOSQL'
SELECT NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'writ_owner') AS create_owner,
       NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'writ_app') AS create_app
\gset
-- The attributes are set at creation only: changing them later, even to
-- the same values, needs a superuser, which the RDS admin is not.
\if :create_owner
	CREATE ROLE writ_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
\endif
\if :create_app
	CREATE ROLE writ_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
\endif

ALTER ROLE writ_owner PASSWORD :'owner_password';
ALTER ROLE writ_app PASSWORD :'app_password';

-- A user who is not a superuser may only give an object to a role it is a
-- member of, so membership is granted for the statements below and removed
-- again at the end. On a second run it is also what lets this user change
-- objects that writ_owner already owns.
GRANT writ_owner TO CURRENT_USER;

-- Nothing is available to a role unless it is granted explicitly.
REVOKE ALL ON DATABASE :"DBNAME" FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE :"DBNAME" TO writ_app;

-- The schema goes first: once the database has changed hands, a
-- non-superuser no longer has any say over its public schema.
ALTER SCHEMA public OWNER TO writ_owner;
ALTER DATABASE :"DBNAME" OWNER TO writ_owner;

-- The current user keeps CONNECT, and nothing else, so that this script
-- can be run again. It has to be granted after the change of owner: a
-- grant to the owner itself is not recorded.
GRANT CONNECT ON DATABASE :"DBNAME" TO CURRENT_USER;

REVOKE writ_owner FROM CURRENT_USER;
EOSQL
