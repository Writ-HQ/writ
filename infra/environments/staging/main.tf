# Staging. Everything is defined in modules/environment; this file only
# chooses the values. Production will be a sibling directory doing the
# same with its own values and state.

module "staging" {
  source = "../../modules/environment"

  environment = "staging"
  vpc_cidr    = "10.20.0.0/16"

  domain_name     = var.domain_name
  route53_zone_id = var.route53_zone_id

  # TODO: once the AWS CLI is available, pin the latest 18.x that RDS
  # offers in ca-central-1 (see the runbook).
  db_engine_version = "18"

  db_roles_script = file("${path.module}/../../../api/db/initdb/01-roles.sh")

  oidc_issuer   = var.oidc_issuer
  oidc_audience = var.oidc_audience

  github_repository = "Writ-HQ/writ"

  api_desired_count = var.api_desired_count
  web_enabled       = false
  worker_enabled    = false

  budget_alert_emails         = var.budget_alert_emails
  budget_alert_thresholds_usd = [50, 100, 150]
}
