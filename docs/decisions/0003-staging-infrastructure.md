# 0003 — Staging infrastructure

Date: 2026-11-12

## Decisions

- **One `environment` module, instantiated per environment.** Staging is
  `infra/environments/staging`; production will be a sibling with its own
  values and state. Smaller modules (network, database, ecs-service,
  github-deploy) sit underneath.
- **State in S3** with versioning, encryption and S3 lock files, in a
  bucket created by `infra/bootstrap`. A person applies Terraform; CI and
  the deploy workflow never do.
- **Private by default.** Tasks and the database are in private subnets
  with no public addresses. Only the load balancer is public. The database
  accepts connections only from the tasks' security group.
- **One NAT gateway in staging** to save about 33 USD a month. Production
  should use one per zone (`single_nat_gateway = false`).
- **TLS to the database is required and verified.** RDS refuses
  unencrypted connections (`rds.force_ssl`). The API image carries the RDS
  certificate authorities and connects with `sslmode=verify-full`.
- **Database passwords never enter Terraform state.** They are generated
  as ephemeral values and written to Secrets Manager with write-only
  arguments (Terraform 1.11 or later). The RDS admin password is managed
  by RDS.
- **Three execution roles**, so the API can read only the `writ_app`
  credentials, the migration task only `writ_owner`'s, and the bootstrap
  task only the admin's.
- **Migrations ship in the API image** as `/migrate` and run as a one-off
  ECS task before each deploy. There is no "down" outside local
  development.
- **Roles are created by the same script everywhere.**
  `api/db/initdb/01-roles.sh` now also works for an admin that is not a
  superuser, as on RDS, and can be run again to rotate passwords.
- **Deploys change only the image.** The workflow registers a new revision
  of the latest task definition with the new image; Terraform ignores
  which revision a service runs. Image tags are the commit SHA and are
  immutable.
- **GitHub deploys through OIDC** with a role limited to this repository's
  `main` branch. It can push to the two ECR repositories, register and tag
  task definitions, run the migration task, update the three named
  services and pass only their roles. It cannot read secrets or run the
  bootstrap task.
- **web and worker are defined but off.** While web is off, all traffic
  goes to the API; with it on, `/v1/*` goes to the API and the rest to web.

## Not verified yet

Nothing here has been planned or applied against a real AWS account. The
code is validated and plan-tested against a mocked provider only. To
confirm on first use: that RDS offers PostgreSQL 18 in ca-central-1, the
role script against real RDS (it was tested against a local non-superuser
admin), and the deploy workflow end to end.

## Follow-ups

- Pin the exact PostgreSQL 18.x version.
- Load balancer access logs and a WAF, before the pilot.
- Alarms (5xx rate, unhealthy targets, database CPU and storage).
- The budget is account-wide; filter by tag once production shares the
  account.
- The image is built for x86. Arm (Graviton) Fargate is about 20% cheaper.
