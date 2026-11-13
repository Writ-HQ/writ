# The workloads. api always runs. web and worker are defined but switched
# off until their code exists. migrate and bootstrap-roles are one-off
# tasks with no service.

locals {
  api_image = "${aws_ecr_repository.this["api"].repository_url}:${var.initial_image_tag}"
  web_image = "${aws_ecr_repository.this["web"].repository_url}:${var.initial_image_tag}"

  # The role script, preceded by fetching the RDS certificate authorities
  # so that psql can verify the database's certificate.
  bootstrap_roles_script = join("\n", [
    "set -eu",
    "wget -qO \"$PGSSLROOTCERT\" https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem",
    var.db_roles_script,
  ])
}

module "api" {
  source = "../ecs-service"

  name               = local.workloads.api
  container_name     = "api"
  cluster_arn        = aws_ecs_cluster.this.arn
  image              = local.api_image
  execution_role_arn = aws_iam_role.execution["app"].arn
  cpu                = var.api_cpu
  memory             = var.api_memory
  log_retention_days = var.log_retention_days

  container_port = local.api_port
  environment = {
    PORT      = tostring(local.api_port)
    LOG_LEVEL = var.log_level
    # staging or production. Outside production the API serves its
    # interactive documentation at /docs.
    ENVIRONMENT   = var.environment
    OIDC_ISSUER   = var.oidc_issuer
    OIDC_AUDIENCE = var.oidc_audience
  }
  secrets = {
    DATABASE_URL = aws_secretsmanager_secret.db["app-url"].arn
  }

  desired_count      = var.api_desired_count
  subnet_ids         = module.network.private_subnet_ids
  security_group_ids = [aws_security_group.tasks.id]
  target_group_arn   = aws_lb_target_group.api.arn

  # A service cannot register with a target group that no listener uses.
  depends_on = [aws_lb_listener.https, aws_lb_listener_rule.api]
}

module "web" {
  source = "../ecs-service"
  count  = var.web_enabled ? 1 : 0

  name               = local.workloads.web
  container_name     = "web"
  cluster_arn        = aws_ecs_cluster.this.arn
  image              = local.web_image
  execution_role_arn = aws_iam_role.execution["app"].arn
  cpu                = var.web_cpu
  memory             = var.web_memory
  log_retention_days = var.log_retention_days

  container_port = local.web_port
  environment = {
    PORT = tostring(local.web_port)
  }
  # Next.js writes its cache next to the application.
  readonly_root_filesystem = false

  desired_count      = var.web_desired_count
  subnet_ids         = module.network.private_subnet_ids
  security_group_ids = [aws_security_group.tasks.id]
  target_group_arn   = aws_lb_target_group.web[0].arn

  depends_on = [aws_lb_listener.https]
}

# Background jobs (River). Same image as the API, different entrypoint,
# no inbound traffic.
module "worker" {
  source = "../ecs-service"
  count  = var.worker_enabled ? 1 : 0

  name               = local.workloads.worker
  container_name     = "worker"
  cluster_arn        = aws_ecs_cluster.this.arn
  image              = local.api_image
  entry_point        = ["/worker"]
  execution_role_arn = aws_iam_role.execution["app"].arn
  cpu                = var.worker_cpu
  memory             = var.worker_memory
  log_retention_days = var.log_retention_days

  environment = {
    LOG_LEVEL = var.log_level
  }
  secrets = {
    DATABASE_URL = aws_secretsmanager_secret.db["app-url"].arn
  }

  desired_count      = var.worker_desired_count
  subnet_ids         = module.network.private_subnet_ids
  security_group_ids = [aws_security_group.tasks.id]
}

# Applies database migrations as writ_owner. The deploy workflow runs it,
# with the new image, before it updates the services.
module "migrate" {
  source = "../ecs-service"

  name               = local.workloads.migrate
  container_name     = "migrate"
  cluster_arn        = aws_ecs_cluster.this.arn
  image              = local.api_image
  entry_point        = ["/migrate"]
  command            = ["up"]
  execution_role_arn = aws_iam_role.execution["migrate"].arn
  log_retention_days = var.log_retention_days

  secrets = {
    DATABASE_URL = aws_secretsmanager_secret.db["owner-url"].arn
  }

  create_service = false
}

# Creates writ_owner and writ_app and sets their passwords, connecting as
# the RDS admin. A person runs it: once when the environment is created
# and again after rotating the passwords. The deploy role cannot run it.
module "bootstrap_roles" {
  source = "../ecs-service"

  name               = "${local.name}-bootstrap-roles"
  container_name     = "bootstrap-roles"
  cluster_arn        = aws_ecs_cluster.this.arn
  image              = var.postgres_client_image
  entry_point        = ["sh", "-c"]
  command            = [local.bootstrap_roles_script]
  execution_role_arn = aws_iam_role.execution["bootstrap"].arn
  log_retention_days = var.log_retention_days

  # The certificate bundle is written to /tmp.
  readonly_root_filesystem = false

  environment = {
    PGHOST        = module.database.address
    PGPORT        = tostring(module.database.port)
    PGSSLMODE     = "verify-full"
    PGSSLROOTCERT = "/tmp/rds-global-bundle.pem"
    POSTGRES_DB   = module.database.db_name
    POSTGRES_USER = module.database.admin_username
  }
  secrets = {
    PGPASSWORD          = "${module.database.admin_secret_arn}:password::"
    WRIT_OWNER_PASSWORD = "${aws_secretsmanager_secret.db["role-passwords"].arn}:owner::"
    WRIT_APP_PASSWORD   = "${aws_secretsmanager_secret.db["role-passwords"].arn}:app::"
  }

  create_service = false
}
