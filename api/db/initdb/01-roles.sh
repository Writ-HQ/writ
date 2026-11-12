#!/bin/sh
# Creates the two database roles Writ uses. Runs once, as the bootstrap
# superuser, when a local or test Postgres container is first initialised.
# Deployed environments create the same roles outside of migrations, with
# passwords from AWS Secrets Manager.
#
#   writ_owner  owns the schema and runs migrations. Not a superuser. Tables
#               use FORCE ROW LEVEL SECURITY, so even the owner is subject
#               to tenant policies.
#   writ_app    the role the API connects as. No superuser, no BYPASSRLS, no
#               DDL. It gets table privileges from the migrations.
set -eu

: "${WRIT_OWNER_PASSWORD:?WRIT_OWNER_PASSWORD must be set}"
: "${WRIT_APP_PASSWORD:?WRIT_APP_PASSWORD must be set}"

psql -v ON_ERROR_STOP=1 \
	--username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
	-v owner_password="$WRIT_OWNER_PASSWORD" \
	-v app_password="$WRIT_APP_PASSWORD" <<'EOSQL'
CREATE ROLE writ_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
	PASSWORD :'owner_password';
CREATE ROLE writ_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
	PASSWORD :'app_password';

ALTER DATABASE :"DBNAME" OWNER TO writ_owner;
ALTER SCHEMA public OWNER TO writ_owner;

-- Nothing is available to a role unless it is granted explicitly.
REVOKE ALL ON DATABASE :"DBNAME" FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE :"DBNAME" TO writ_app;
EOSQL
