# Database credentials.
#
# The passwords for writ_owner and writ_app are generated here as
# ephemeral values and written to Secrets Manager through write-only
# arguments, so they exist in neither the plan nor the state file. They
# are written once; to rotate, raise db_credentials_version, apply, run
# the role bootstrap task and deploy (see the runbook).
#
# Three secrets, each readable by one execution role only:
#   database/app-url        DATABASE_URL for the API and worker (writ_app)
#   database/owner-url      DATABASE_URL for migrations (writ_owner)
#   database/role-passwords both passwords, for the role bootstrap task
# The RDS admin password is a fourth secret, created and rotated by RDS.

ephemeral "random_password" "db" {
  for_each = toset(["owner", "app"])

  length = 40
  # Letters and digits only, so the password needs no escaping in a URL.
  special = false
}

locals {
  # verify-full: encrypt, and check both that the certificate chains to
  # the RDS authorities in the image and that it names this host.
  db_url_suffix = "@${module.database.address}:${module.database.port}/${module.database.db_name}?sslmode=verify-full&sslrootcert=/etc/ssl/rds/global-bundle.pem"

  db_secrets = {
    app-url        = "postgres://writ_app:${ephemeral.random_password.db["app"].result}${local.db_url_suffix}"
    owner-url      = "postgres://writ_owner:${ephemeral.random_password.db["owner"].result}${local.db_url_suffix}"
    role-passwords = jsonencode({ for k, v in ephemeral.random_password.db : k => v.result })
  }
}

resource "aws_secretsmanager_secret" "db" {
  for_each = toset(["app-url", "owner-url", "role-passwords"])

  name                    = "${var.project}/${var.environment}/database/${each.key}"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "db" {
  for_each = aws_secretsmanager_secret.db

  secret_id                = each.value.id
  secret_string_wo         = local.db_secrets[each.key]
  secret_string_wo_version = var.db_credentials_version
}
