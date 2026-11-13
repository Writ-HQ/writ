# One complete Writ environment. Staging is one instance of this module;
# production will be a second, with its own variables and its own state.
#
# Every resource is tagged project and environment through the provider's
# default_tags, which the calling configuration sets.

terraform {
  required_version = ">= 1.11"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  name       = "${var.project}-${var.environment}"
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.region

  api_port = 8080
  web_port = 3000

  # Workloads are named by convention so that IAM can refer to one that is
  # switched off and does not exist yet.
  workloads = {
    api     = "${local.name}-api"
    web     = "${local.name}-web"
    worker  = "${local.name}-worker"
    migrate = "${local.name}-migrate"
  }
  task_role_arns = {
    for k, v in local.workloads : k => "arn:aws:iam::${local.account_id}:role/${v}-task"
  }
}

module "network" {
  source = "../network"

  name               = local.name
  vpc_cidr           = var.vpc_cidr
  single_nat_gateway = var.single_nat_gateway
}

module "database" {
  source = "../database"

  name       = local.name
  vpc_id     = module.network.vpc_id
  subnet_ids = module.network.private_subnet_ids

  allowed_security_group_ids = { tasks = aws_security_group.tasks.id }

  engine_version        = var.db_engine_version
  instance_class        = var.db_instance_class
  allocated_storage_gb  = var.db_allocated_storage_gb
  multi_az              = var.db_multi_az
  backup_retention_days = var.db_backup_retention_days
  deletion_protection   = var.deletion_protection
}

# Container images. Tags are immutable: a tag, once pushed, always means
# the same image, so a task definition revision can be trusted to run what
# it says.
resource "aws_ecr_repository" "this" {
  for_each = toset(["api", "web"])

  name                 = "${local.name}-${each.key}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

resource "aws_ecr_lifecycle_policy" "this" {
  for_each = aws_ecr_repository.this

  repository = each.value.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the most recent images, enough to roll back"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = var.ecr_images_to_keep
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_ecs_cluster" "this" {
  name = local.name

  setting {
    name  = "containerInsights"
    value = var.container_insights ? "enabled" : "disabled"
  }
}

# Shared by every task. Inbound only from the load balancer; outbound only
# HTTPS (AWS APIs, image pulls) and PostgreSQL to the database.
resource "aws_security_group" "tasks" {
  name        = "${local.name}-tasks"
  description = "Application tasks"
  vpc_id      = module.network.vpc_id

  tags = { Name = "${local.name}-tasks" }
}

resource "aws_vpc_security_group_ingress_rule" "tasks_from_alb" {
  for_each = var.web_enabled ? { api = local.api_port, web = local.web_port } : { api = local.api_port }

  security_group_id            = aws_security_group.tasks.id
  description                  = "${each.key} from the load balancer"
  referenced_security_group_id = aws_security_group.alb.id
  ip_protocol                  = "tcp"
  from_port                    = each.value
  to_port                      = each.value
}

resource "aws_vpc_security_group_egress_rule" "tasks_https" {
  security_group_id = aws_security_group.tasks.id
  description       = "HTTPS to AWS services and the internet, through the NAT gateway"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "tasks_postgres" {
  security_group_id            = aws_security_group.tasks.id
  description                  = "PostgreSQL to the database"
  referenced_security_group_id = module.database.security_group_id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}

module "github_deploy" {
  source = "../github-deploy"

  name                 = "${local.name}-github-deploy"
  github_repository    = var.github_repository
  branch               = var.deploy_branch
  create_oidc_provider = var.create_github_oidc_provider

  ecr_repository_arns   = [for r in aws_ecr_repository.this : r.arn]
  cluster_name          = aws_ecs_cluster.this.name
  service_names         = [local.workloads.api, local.workloads.web, local.workloads.worker]
  migration_task_family = local.workloads.migrate
  task_family_prefix    = "${local.name}-"

  passable_role_arns = concat(
    [aws_iam_role.execution["app"].arn, aws_iam_role.execution["migrate"].arn],
    values(local.task_role_arns),
  )
}
