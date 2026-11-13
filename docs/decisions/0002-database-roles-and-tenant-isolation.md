# 0002 — Database roles and tenant isolation

Date: 2026-11-12

## Decisions

- **Two roles, created outside migrations.** `writ_owner` owns the schema
  and runs migrations; `writ_app` is what the API connects as. Neither is a
  superuser or has BYPASSRLS, CREATEROLE or CREATEDB. Roles are cluster-wide
  and carry passwords, so `api/db/initdb/01-roles.sh` creates them for
  local and test databases, and deployed environments will create them
  with passwords from AWS Secrets Manager. The first migration fails with a
  clear message if `writ_app` is missing.
- **Privileges are granted table by table** in the migration that creates
  the table. There are no default privileges, so a new table is
  inaccessible to the API until its migration says otherwise.
- **`writ_app` is never granted DELETE.** The "no hard deletes" rule is
  enforced by the database, not only by convention.
- **Row-level security is enabled and forced** on every table. Policies call `current_tenant_id()`, which reads
  `app.tenant_id` and treats both "never set" and the empty string as no
  tenant. The empty string matters: after a transaction that used
  `SET LOCAL`, a pooled connection reports `''`, not NULL.
- **A missing tenant shows nothing; it does not raise.** Reads return no
  rows and writes fail the policy check. Queries on tenant tables do not
  filter by `tenant_id` themselves, so forgetting the tenant context can
  never return another tenant's rows.
- **`database.WithTenant` and `database.WithUser` are the only way in.**
  They set `app.tenant_id` and `app.user_id` with
  `set_config(name, $1, true)`, which is `SET LOCAL` in a form that takes a
  bind parameter. See "User context" below.
- **`audit_log` is append-only at three levels:** `writ_app` has no UPDATE,
  DELETE or TRUNCATE privilege; there is no row-level security policy for
  UPDATE or DELETE; and triggers reject UPDATE, DELETE and TRUNCATE from
  every role, including superusers.
- **Text columns with CHECK constraints, not enum types,** for role,
  status and locale, because changing an enum needs more careful
  migrations.
- **PostgreSQL 18, UUIDv7 primary keys** (`uuidv7()`), which index better
  than random UUIDs on tables that grow by time, such as `audit_log`.
- **Tests run against real PostgreSQL** through testcontainers
  (`internal/database/dbtest`), with the same roles and migrations as
  every other environment. One test asserts that every table has
  row-level security enabled, forced and a policy.

## User context (added 2026-11-12, migration 00006)

This resolves two questions the first version of this note left open:
`tenants` and `users` had no row-level security, and there was no way to
list a user's tenants before a tenant was chosen.

- **A second setting, `app.user_id`,** read by `current_user_id()` with the
  same rules as the tenant: unset and empty both mean nobody, and nobody
  matches no rows. It never raises.
- **Two helpers.** `WithUser` sets the user only, for requests made before
  a tenant is chosen (list my tenants, my profile). `WithTenant` sets both.
  Each writes both settings every time, so neither can be inherited. The
  API must check membership before calling `WithTenant`; the database
  does not repeat that check.
- **memberships:** the tenant policy is unchanged. A SELECT-only policy
  also shows a user their own memberships in every tenant.
- **tenants:** readable and updatable as the current tenant; readable by a
  user with an active, non-deleted membership. An invitation does not
  reveal the tenant. Any user context may insert.
- **Creating a tenant:** the caller generates the id and calls
  `WithTenant` with it, then inserts the tenant, the owner membership and
  the audit event in that one transaction. In a user-only context the
  insert fails, because the new row could not be read back.
- **users:** a user reads and updates their own row. Members of the
  current tenant are readable in that tenant only; sharing some other
  tenant is not enough. `writ_app` cannot insert into `users` and can
  update only `email`, `display_name` and `locale`.
- **No recursion.** Policies on `tenants` and `users` read `memberships`;
  policies on `memberships` read no table. Keep that direction.
- **`provision_user` is the one path around the policies.** At login the
  API knows only the identity provider's subject, has no user id to set,
  and on first login there is no row. The function is SECURITY DEFINER,
  owned by `writ_owner`, with a fixed `search_path`, and executable only
  by `writ_app`. It finds or creates one row by exact `external_auth_id`,
  never changes an existing row, and cannot list or search. Because
  row-level security is forced, the owner is bound too: the function
  passes through a policy that applies only to `writ_owner` and only to
  the row being provisioned. A test asserts it is the only SECURITY
  DEFINER function in the schema. The API must pass a subject from a
  verified token, never from request input.

## Follow-ups

- **River needs its own schema.** River deletes completed jobs, and
  `writ_app` has no DELETE anywhere. Give River a separate schema where
  the application role has DELETE, and keep `public` without it.
- **Privacy deletion needs a separate privileged purge path.** Deletion
  requests and retention limits will require removing personal data, which
  `writ_app` cannot do and `audit_log` forbids. That needs its own
  controlled, audited process, not a wider grant to the API role.
- **Work with no user.** `WithTenant` requires a user. Background jobs and
  webhooks that act for a tenant with no person behind them have no helper
  yet; decide how they are represented when River is added.
- **Since migration 00007** `provision_user` reads before it writes, and
  `users.email` may be NULL (see 0004).
- **Profile sync at login.** `provision_user` does not update an existing
  user. If email or name should follow the identity provider, the API
  updates the user's own row in `WithUser` after provisioning.
- **Invitations.** An invited user can see their membership but not the
  tenant's name. The invitation flow will need a deliberate way to show
  it.
