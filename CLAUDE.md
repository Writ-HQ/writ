# Writ — Project Memory

## What this is
A multi-tenant, automated CRM for political campaigns in Canada. Modelled on
Campaign Nucleus (US), with two differences: native social media integration
and Canada-specific compliance, bilingual support, and privacy.

Each customer (a campaign, candidate, riding association, or advocacy group)
is a tenant. Tenants are often political opponents, so data isolation between
them is the most important property of the system.

## Users
- Owner / campaign manager: full control, billing, exports
- Admin: manages team, settings, and data
- Staff: day-to-day CRM, messaging, social inbox
- Volunteer: limited access to assigned lists only

First customer type: [municipal / provincial / nomination — TBD]. Keep the
schema jurisdiction-neutral until this is decided.

## Roadmap (15 weeks)
- Weeks 1–3: Foundation — repo, CI, staging, auth with MFA, tenants, roles,
  invitations, audit log, row-level security
- Weeks 4–7: Core CRM — contacts, households, tags, custom fields, segments,
  CSV import (validate, preview, commit, rollback), deduplication, consent
- Weeks 8–10: Email (SES), bilingual templates, unsubscribe, tracking,
  signup forms and landing pages. Pilot starts week 10.
- Weeks 11–15: Social — Facebook and Instagram unified inbox matched to
  contacts, scheduled publishing with approvals. Penetration test week 15.
- Later: automation journeys (Temporal), donations and tax receipts, events,
  riding maps (PostGIS), SMS, more social platforms, AI features, mobile
  canvassing app.

Current status: Week 1. API skeleton exists in /api (config, slog JSON
logging, request ID and recovery middleware, graceful shutdown, /healthz,
/readyz, Dockerfile, Makefile with run/test/lint). OpenAPI contract with
error and pagination conventions, `make generate` (oapi-codegen,
openapi-typescript) are in place. CI (lint, race tests, govulncheck,
generated-code check, web type-check, Docker build) and Dependabot are
configured but have not run yet: the repo is not on GitHub. Error codes
live in /api/internal/apierror/codes.go and must match the ErrorCode enum
in the spec. /web holds only the generated API client so far. PostgreSQL 18
is in: migrations in /api/db/migrations (tenants, users, memberships,
audit_log), roles writ_owner and writ_app, sqlc per module, and
database.WithTenant (sets app.tenant_id and app.user_id) and
database.WithUser (user only, before a tenant is chosen) as the transaction
helpers. Every table is under row-level security; users are created only
through the provision_user database function. Database tests use
testcontainers via /api/internal/database/dbtest and need Docker.
Follow-ups are listed in /docs/decisions/0002. Authentication is in: httpserver.Authenticate verifies the Zitadel JWT
access token on every request except the public endpoints (which must
match `security: []` in the spec), auth.Service finds or creates the user,
and handlers read it with auth.UserFromContext. GET /v1/me is the first
authenticated endpoint. Tests use the fake identity provider in
/api/internal/auth/authtest; end-to-end tests are in /api/internal/e2e.
Profile data (email only if verified, name, locale) comes from the
provider's userinfo endpoint, on first sight and when older than 24 hours,
never from access token claims. OIDC_REQUIRE_MFA adds an optional check of
the authentication-method claim (error code mfa_required); its accepted
values (OIDC_MFA_METHODS) have no default and must be read from a real
Zitadel token. Keep it off: the development instance's access tokens carry
no authentication-method claim (checked 2026-11-13), so MFA is enforced by
Zitadel's Force MFA policy alone. OIDC_AUDIENCE is the Zitadel project ID.
Zitadel is the system of record for sign-ins.
security_events is a user-scoped, append-only table (RLS on app.user_id)
for user provisioned, email changed, account disabled or enabled, and
mfa_required rejections. users.disabled_at is the app-level kill switch:
checked on every request (error code account_disabled), not settable by
the API role, and every change is recorded by a trigger. Access tokens
live one hour. ENVIRONMENT (local, staging, production; default
production) turns on the interactive API docs at /docs outside production.
/api/cmd/devtoken gets a developer an access token through the device
flow. The real-token test against the development Zitadel passed on
2026-11-13: see /docs/runbooks/zitadel-smoke-test.md and
/docs/decisions/0004. Work deferred to before the pilot or launch is
listed in /docs/before-launch.md; add to it whenever something is
deferred. /infra holds Terraform for staging (modules network, database,
ecs-service, github-deploy, environment; instantiated in
/infra/environments/staging; state bucket in /infra/bootstrap). It is
validated and plan-tested but has never been applied. /api/cmd/migrate
applies migrations and ships in the API image.
.github/workflows/deploy-staging.yml deploys on merge to main through
OIDC, but only when the repository variable DEPLOY_ENABLED is true. See
/docs/runbooks/staging.md and /docs/decisions/0003. Not yet done: tenant
selection and permission checks, /api/cmd/worker, the Next.js app.

## Stack
- API: Go, chi, pgx, sqlc, goose, River (jobs), go-playground/validator, slog
- Database: PostgreSQL with row-level security (PostGIS and pg_trgm later)
- Cache and rate limiting: Redis
- Web: Next.js App Router, TypeScript strict, Tailwind, shadcn/ui,
  TanStack Query, TanStack Table, React Hook Form, Zod, next-intl
- API contract: OpenAPI 3 in /openapi/openapi.yaml; oapi-codegen for Go,
  openapi-typescript for web
- Auth: Zitadel (OIDC), MFA required
- Files: S3 with presigned uploads, CloudFront signed URLs
- Email: Amazon SES
- Infra: AWS ca-central-1, ECS Fargate, RDS, Terraform, GitHub Actions
- Observability: OpenTelemetry, Sentry
- Not yet in use (do not add without being asked): ClickHouse, Temporal,
  Typesense, Kafka, microservices

## Repository layout
- /api — Go. /api/cmd/server, /api/cmd/worker, /api/internal/<module>
- /web — Next.js
- /openapi — API spec
- /infra — Terraform
- /docs — decisions and notes

## Architecture rules
- Modular monolith. Modules: auth, tenants, audit, contacts, imports,
  messaging, social (more later).
- Each module owns its tables. A module never queries another module's
  tables; it calls that module's Go interface.
- All business logic lives in Go. Next.js only renders and calls the API.
- API is versioned under /v1. Change the OpenAPI spec first, run
  `make generate`, then implement.
- List endpoints use cursor pagination and support filtering.
- Slow or external work (email, imports, webhooks) runs as River jobs,
  enqueued in the same transaction as the data change.
- External providers (SES, Meta, etc.) sit behind our own Go interfaces.

## Data rules
- Every tenant-scoped table has tenant_id NOT NULL, row-level security
  enabled and forced, and a policy using current_setting('app.tenant_id').
- Tables that belong to a user rather than a tenant (users,
  security_events) are under forced row-level security keyed on
  current_setting('app.user_id').
- All tenant queries run through the tenant transaction helper, which sets
  app.tenant_id with SET LOCAL. Never query tenant tables outside it.
- The application database role has no superuser or BYPASSRLS rights.
- Every table has created_at and updated_at. No hard deletes: use deleted_at.
- Primary keys are UUIDs.
- audit_log is append-only. Record an audit event, in the same transaction,
  for every sensitive action: logins, exports, role changes, deletions,
  imports, sends.
- Track consent and opt-out per contact per channel.

## Security rules
- Never log personal data (names, emails, phones, addresses, notes).
- Never commit secrets. Secrets come from environment variables locally and
  AWS Secrets Manager in deployed environments.
- Every endpoint requires auth and a permission check unless explicitly
  public. Return 404, not 403, for tenants the user does not belong to.
- Only owner and admin roles may export data.
- Validate all input. Use sqlc parameterised queries only; no string-built SQL.
- Uploaded files: verify real type, enforce size limits, store under a
  tenant-prefixed key, never serve from a public bucket.
- Use only fictional data in seeds, tests, and examples.

## Canadian requirements
- English and French for every user-facing string, email template, and
  error message, via next-intl. A test fails if a key is missing in fr.
- All data stays in AWS ca-central-1.
- Design for: consent records, data retention and deletion, breach
  notification, and no sale of voter data.
- Stay non-partisan in naming, copy, examples, and colours.

## Working conventions
- Every change includes tests. Lint and tests must pass before finishing.
- Every new tenant-scoped table needs a test proving cross-tenant reads
  and writes fail.
- Small, focused changes. Do not refactor unrelated code.
- Start each task on a new branch from an up-to-date main. Commit as you go
  and open a pull request when the task is done. Never leave finished work
  uncommitted.
- For large tasks, propose a plan and wait for approval before coding.
- Check current official documentation for library versions and APIs
  rather than assuming.
- Never run `terraform apply` or production migrations; show the plan and
  let a human run it.
- Record significant decisions as short notes in /docs/decisions.

## Commands
Run from the repo root:
- make run — start API locally (needs OIDC_ISSUER and OIDC_AUDIENCE to
  point at Zitadel for anything but the probes to work)
- make devtoken — sign in through the browser and print an access token
  (needs OIDC_ISSUER and OIDC_DEVTOKEN_CLIENT_ID)
- make test — run Go tests
- make lint — run linters
- make vuln — run govulncheck
- make db-up / make db-down — start or stop local PostgreSQL (Docker,
  host port 54320)
- make migrate / make migrate-status — apply goose migrations to the local
  database, or list them
- make generate — regenerate code from OpenAPI (Go into
  /api/internal/oapi, TypeScript into /web/src/lib/api) and from SQL
  queries with sqlc (into /api/internal/<module>/<module>db)
- make generate-check — fail if generated code is out of date (CI runs this)
- npm --prefix web run typecheck — type-check the web API client
- make infra-check — format-check, validate and plan-test the Terraform
  code against a mocked provider (no AWS access, applies nothing)
- [add web commands as they are created]
