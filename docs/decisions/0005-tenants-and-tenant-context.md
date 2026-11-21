# 0005 — Tenants and the tenant context

Date: 2026-11-13

## Decisions

- **The tenant comes from the path.** Every tenant-scoped operation lives
  under `/v1/tenants/{tenant_id}`. There is no tenant header and no
  "current tenant" stored anywhere: each request names its tenant, so a
  request can never run against a tenant left over from an earlier one,
  and the tenant is visible in every route.
- **One membership check, in one place.** `httpserver.TenantContext` runs
  for every operation whose path has a `{tenant_id}` parameter. It calls
  `tenants.Service.Resolve`, which succeeds only if the caller is an
  active member of a tenant that has not been deleted, and puts the
  tenant and the caller's role in the request context. Handlers read them
  with `tenants.MembershipFromContext` and then work inside
  `database.WithTenant`. This is the check that `WithTenant` has always
  relied on its caller to make (see 0002).
- **It keys on the parameter name,** so a new tenant-scoped operation is
  covered by where its path sits. A test fails if a path names a tenant
  any other way.
- **Everything else is 404, identical to an unknown path:** a tenant that
  does not exist or is soft-deleted, one the caller was never in, a
  membership that is invited, suspended or removed, and a tenant ID that
  is not a UUID. Tests compare the response bodies byte for byte.
  403 is only ever returned to an active member who lacks a permission.
- **The check runs as the user, under row-level security.** `Resolve` and
  the tenant list use `database.WithUser`; nothing queries around the
  policies. The queries repeat the membership conditions that the
  `tenants` policy already enforces, deliberately, so that neither layer
  depends on the other. The deleted-tenant condition is in the query only.
- **The membership is checked on every request,** not cached, so a change
  of role or a suspension takes effect on the next request.
- **Tenant creation is restricted for the pilot.** `POST /v1/tenants`
  requires `users.platform_admin` unless `TENANT_SELF_SERVE=true`.
- **`platform_admin` grants tenant creation and nothing else.** It is in
  no row-level security policy. A platform admin who is not a member of a
  tenant gets the same 404 as anyone. Like the kill switch, the API's
  database role cannot change it, an operator sets it as `writ_owner`
  acting for that user (the SQL is in migration 00010), and a trigger
  records `platform_admin.granted` or `platform_admin.revoked` in
  `security_events` in the same transaction.
- **The creator becomes the owner.** The tenant, the owner's membership
  and the audit event are written in one transaction, with a tenant ID
  the API generates so that the transaction can act as the new tenant.
- **`GET /v1/me` reports `platform_admin`,** so that the interface can
  decide whether to offer tenant creation.
- **Slugs are generated: the name, then a random eight-character suffix.**
  A slug made from the name alone would make a create request fail when
  another tenant already had it, which would reveal that tenant. With the
  suffix a collision is an accident; it is retried with a new suffix and
  never reported. Accents are folded ("Comité" becomes "comite"). The slug
  does not change when the name does.
- **Roles are owner, admin, staff and volunteer,** and the permission
  table is one explicit list per role in `tenants/permissions.go`, with no
  inheritance: `tenant.read` for every role, `tenant.update` for owner and
  admin. A test pins the whole table. The next step adds to it.
- **Permission is checked before validation,** so a caller who may not do
  something learns nothing about what a valid request looks like.
- **Audit events** `tenant.created` and `tenant.updated` are written
  through `audit.Record`, the audit module's interface, in the caller's
  transaction. `tenant.updated` records which fields changed, not their
  values.
- **The tenant list is cursor-paginated by tenant ID,** which is creation
  order because IDs are UUIDv7. A forged cursor can only skip the
  caller's own tenants.
- **Error bodies built by handlers carry the request ID** through
  `apierror.New`, which reads it from the request context.
- **Timestamps are returned in UTC,** as the contract says, whatever zone
  the server runs in.

## Follow-ups

- **Member management**: listing members, changing roles, removing
  members, and invitations. With it, the way for a platform admin to hand
  a tenant over and leave (see `docs/before-launch.md`).
- **`GET /v1/me` does not say whether self-service is on.** With
  `TENANT_SELF_SERVE=true` everyone may create a tenant but
  `platform_admin` is still false for most. If self-service is ever
  enabled, add a field that says what the caller may do.
- **The client's address is not recorded in `audit_log`.** The column
  exists; filling it needs a decision on trusting the load balancer's
  forwarded header.
- **Deleting a tenant** has no endpoint. Soft deletion is honoured
  everywhere it is checked.
- **Admin tooling** for `platform_admin`, with the kill switch (see 0004).
