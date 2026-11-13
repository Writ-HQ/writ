# Staging runbook

Staging runs in AWS ca-central-1 and is defined in `/infra`. Terraform is
always applied by a person. The deploy workflow changes only the running
image.

Commands below assume you are signed in with the AWS CLI
(`aws sso login`) and are in the repo root unless a step says otherwise.
Planning needs read-only access; applying, running the bootstrap task and
rolling back by hand need an administrator role.

## What is where

| Thing | Name |
|---|---|
| Terraform state | S3 bucket `writ-terraform-state-<account id>`, key `staging/terraform.tfstate` |
| ECS cluster | `writ-staging` |
| API service and task family | `writ-staging-api` |
| Migration task family | `writ-staging-migrate` |
| Role bootstrap task family | `writ-staging-bootstrap-roles` |
| Logs | CloudWatch groups `/writ/staging/api`, `/writ/staging/migrate`, `/writ/staging/bootstrap/roles` |
| Secrets | `writ/staging/database/app-url`, `owner-url`, `role-passwords`, plus the RDS-managed admin secret |
| Deploy role | `writ-staging-github-deploy` |

## First-time setup, in order

### 1. Create the state bucket (once per AWS account)

```sh
cd infra/bootstrap
terraform init
terraform plan
terraform apply
```

Note the `state_bucket` output. This configuration keeps its own small
state in a local file, which is not committed and holds nothing secret. If
it is lost, recover with
`terraform import aws_s3_bucket.state <bucket name>`.

### 2. Configure staging

```sh
cd infra/environments/staging
cp backend.hcl.example backend.hcl            # set the bucket from step 1
cp terraform.tfvars.example terraform.tfvars  # domain, alert email, Zitadel issuer and audience
terraform init -backend-config=backend.hcl
```

Neither file is committed. Set `route53_zone_id` if the domain's DNS is in
Route 53; leave it out to add DNS records by hand.

### 3. Pin the PostgreSQL version

`main.tf` asks for `"18"`, which lets RDS choose the minor version. Find
the latest and pin it there before the first apply:

```sh
aws rds describe-db-engine-versions --engine postgres --region ca-central-1 \
  --query 'DBEngineVersions[?starts_with(EngineVersion, `18`)].EngineVersion' --output text
```

### 4. First apply, with no API tasks

There is no image yet, so start with zero tasks:

```sh
terraform plan -var api_desired_count=0 -out staging.tfplan
terraform apply staging.tfplan
```

Read the plan before applying. The apply pauses at
`aws_acm_certificate_validation` until the certificate's DNS record
exists:

- With Route 53, Terraform creates the record and continues by itself.
- Otherwise, open the certificate in the ACM console (ca-central-1), add
  the CNAME it shows at your DNS provider, and the apply continues within
  a few minutes. Afterwards add a second CNAME pointing the staging host
  name at the `load_balancer_dns_name` output.

### 5. Create the database roles

Migrations create `writ_owner` and `writ_app`'s tables but not the roles
themselves. A one-off task creates the roles, connecting as the RDS admin:

```sh
terraform output -raw bootstrap_roles_command   # prints the command; run it
```

Then check that it succeeded (exit code 0), using the task ARN it printed:

```sh
aws ecs describe-tasks --region ca-central-1 --cluster writ-staging --tasks <task arn> \
  --query 'tasks[0].containers[0].{exit:exitCode,reason:reason}'
aws logs tail /writ/staging/bootstrap/roles --region ca-central-1
```

The task runs `api/db/initdb/01-roles.sh`, the same script local
development and the tests use. It is safe to run again. The deploy
workflow cannot run it.

### 6. Connect GitHub and deploy

```sh
gh variable set AWS_DEPLOY_ROLE_ARN --body "$(terraform output -raw github_deploy_role_arn)"
gh workflow run deploy-staging.yml --ref main
```

The workflow pushes the image, runs migrations and updates the service,
which still has zero tasks.

### 7. Start the API

```sh
terraform plan -out staging.tfplan    # api_desired_count returns to 1
terraform apply staging.tfplan
curl https://<staging host name>/readyz
```

## Applying a change

```sh
cd infra/environments/staging
terraform plan -out staging.tfplan
terraform apply staging.tfplan
```

Always apply a saved plan, so that what is applied is what was read.
`make infra-check` (also run by CI) checks formatting, validates and runs
the plan tests without AWS access; it is not a substitute for reading the
plan.

A change to a task's settings (CPU, memory, environment, secrets) reaches
running tasks at the next deploy. To apply it now, run the deploy workflow
by hand: `gh workflow run deploy-staging.yml --ref main`.

## Deploys

Merging to `main` with changes under `/api` runs
`.github/workflows/deploy-staging.yml`: build, push, migrate, deploy. It
authenticates with OIDC; there are no AWS keys in GitHub. If the new tasks
do not become healthy, ECS returns to the previous version by itself and
the workflow fails.

Migrations run before the new version starts, while the old one is still
serving. Write them so that the previous version keeps working: add
first, remove in a later release.

## Rolling back a deploy

**Preferred: revert the commit.** Revert it on `main` through a pull
request. The workflow deploys the previous code as a new image. This
keeps `main` and staging in agreement.

**Faster: point the service at the previous revision.** Each deploy is a
task definition revision; older ones remain.

```sh
aws ecs list-task-definitions --region ca-central-1 \
  --family-prefix writ-staging-api --sort DESC --max-items 5
aws ecs update-service --region ca-central-1 --cluster writ-staging \
  --service writ-staging-api --task-definition writ-staging-api:<revision>
aws ecs wait services-stable --region ca-central-1 --cluster writ-staging \
  --services writ-staging-api
```

Then revert the commit as well, or the next merge deploys the bad version
again.

**Migrations are not rolled back.** There is no "down" in deployed
environments. Either the previous version works with the new schema (the
rule above), or the fix is a new migration. Restoring the database to a
point in time creates a new instance and loses later writes; treat it as
a last resort and a deliberate decision.

## Rotating the database passwords

1. Raise `db_credentials_version` by one in the staging module call, then
   plan and apply. New passwords are written to Secrets Manager.
2. Run the role bootstrap task again (step 5). It sets the new passwords
   on the roles. Until the next step, running API tasks keep their open
   connections but new connections fail.
3. Run the deploy workflow by hand so that new tasks start with the new
   secret.

The RDS admin password is rotated by RDS itself.

## Budget alerts

Emails go to `budget_alert_emails` when the month's actual spend passes
50, 100 and 150 USD. The budget covers the whole AWS account.
