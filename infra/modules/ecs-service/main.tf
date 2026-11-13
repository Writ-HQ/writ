# One Fargate workload: a task definition, its log group and task role,
# and, unless it is a one-off task such as a migration, a service that
# keeps it running.
#
# The container image is managed by the deploy workflow, not Terraform:
# each deploy registers a new revision of this task definition with the
# new image. Terraform therefore ignores which revision the service runs.
# A change made here (CPU, environment, secrets) takes effect at the next
# deploy, which starts from the latest revision.

terraform {
  required_version = ">= 1.11"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

data "aws_region" "current" {}

data "aws_iam_policy_document" "assume_ecs_tasks" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# What the running code may do in AWS. Empty to begin with: permissions
# are added by the caller when a service needs them (S3, SES and so on).
resource "aws_iam_role" "task" {
  name               = "${var.name}-task"
  assume_role_policy = data.aws_iam_policy_document.assume_ecs_tasks.json
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/${replace(var.name, "-", "/")}"
  retention_in_days = var.log_retention_days
}

locals {
  container = merge(
    {
      name      = var.container_name
      image     = var.image
      essential = true

      readonlyRootFilesystem = var.readonly_root_filesystem

      environment = [
        for k in sort(keys(var.environment)) : { name = k, value = var.environment[k] }
      ]
      # valueFrom is a Secrets Manager ARN. ECS injects the value at start;
      # it is never stored in the task definition.
      secrets = [
        for k in sort(keys(var.secrets)) : { name = k, valueFrom = var.secrets[k] }
      ]
      portMappings = var.container_port == null ? [] : [
        { containerPort = var.container_port, hostPort = var.container_port, protocol = "tcp" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.this.name
          awslogs-region        = data.aws_region.current.region
          awslogs-stream-prefix = var.container_name
        }
      }

      # Set explicitly so the definition matches what ECS reports back.
      cpu            = 0
      mountPoints    = []
      volumesFrom    = []
      systemControls = []
    },
    var.entry_point == null ? {} : { entryPoint = var.entry_point },
    var.command == null ? {} : { command = var.command },
  )
}

resource "aws_ecs_task_definition" "this" {
  family                   = var.name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([local.container])
}

resource "aws_ecs_service" "this" {
  count = var.create_service ? 1 : 0

  name            = var.name
  cluster         = var.cluster_arn
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }

  dynamic "load_balancer" {
    for_each = var.target_group_arn == null ? [] : [var.target_group_arn]
    content {
      target_group_arn = load_balancer.value
      container_name   = var.container_name
      container_port   = var.container_port
    }
  }

  health_check_grace_period_seconds = var.target_group_arn == null ? null : 30

  # Keep the old tasks until the new ones are healthy. If they never
  # become healthy, ECS returns to the previous revision by itself.
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_ecs_managed_tags = true
  propagate_tags          = "SERVICE"

  lifecycle {
    ignore_changes = [task_definition]
  }
}
