# Execution roles: what ECS itself may do to start a task (pull the image,
# write logs, read the secrets it injects). One per kind of task, so each
# can read only its own secrets.

data "aws_iam_policy_document" "assume_ecs_tasks" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

locals {
  execution_secrets = {
    app     = [aws_secretsmanager_secret.db["app-url"].arn]
    migrate = [aws_secretsmanager_secret.db["owner-url"].arn]
    bootstrap = [
      aws_secretsmanager_secret.db["role-passwords"].arn,
      module.database.admin_secret_arn,
    ]
  }
}

resource "aws_iam_role" "execution" {
  for_each = local.execution_secrets

  name               = "${local.name}-${each.key}-execution"
  assume_role_policy = data.aws_iam_policy_document.assume_ecs_tasks.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  for_each = aws_iam_role.execution

  role       = each.value.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution_secrets" {
  for_each = local.execution_secrets

  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = each.value
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  for_each = aws_iam_role.execution

  name   = "read-own-secrets"
  role   = each.value.id
  policy = data.aws_iam_policy_document.execution_secrets[each.key].json
}
