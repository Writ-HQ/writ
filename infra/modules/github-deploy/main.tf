# The role GitHub Actions assumes to deploy. There are no stored AWS keys:
# GitHub presents a short-lived OIDC token and AWS exchanges it for
# temporary credentials, but only for the one repository and branch named
# here.
#
# The role can do four things and nothing else: push images to the given
# ECR repositories, register (and tag) new task definition revisions, run
# the migration task, and update the given ECS services. It cannot read
# secrets, touch the database, change infrastructure or run any other
# task (notably not the role bootstrap task).

terraform {
  required_version = ">= 1.11"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.region
  oidc_host  = "token.actions.githubusercontent.com"

  oidc_provider_arn = (
    var.create_oidc_provider
    ? aws_iam_openid_connect_provider.github[0].arn
    : "arn:aws:iam::${local.account_id}:oidc-provider/${local.oidc_host}"
  )
}

# An AWS account can hold only one provider per issuer. The first
# environment in an account creates it; later ones set
# create_oidc_provider = false and reuse it.
resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url            = "https://${local.oidc_host}"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_policy_document" "trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Exact match, no wildcard: pull requests, other branches, tags and
    # forks cannot assume this role.
    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:sub"
      values   = ["repo:${var.github_repository}:ref:refs/heads/${var.branch}"]
    }
  }
}

resource "aws_iam_role" "deploy" {
  name                 = var.name
  description          = "Assumed by GitHub Actions in ${var.github_repository} on ${var.branch} to deploy"
  assume_role_policy   = data.aws_iam_policy_document.trust.json
  max_session_duration = 3600
}

data "aws_iam_policy_document" "deploy" {
  statement {
    sid = "EcrLogin"
    # Returns a registry login token. It does not support resource-level
    # permissions; what the token can do is limited by the next statement.
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "EcrPush"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = var.ecr_repository_arns
  }

  statement {
    sid = "TaskDefinitions"
    # Neither action supports resource-level permissions. What a new
    # revision can run as is limited by PassRoles below.
    actions = [
      "ecs:DescribeTaskDefinition",
      "ecs:RegisterTaskDefinition",
    ]
    resources = ["*"]
  }

  statement {
    sid       = "PassRoles"
    actions   = ["iam:PassRole"]
    resources = var.passable_role_arns

    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }

  statement {
    sid = "Services"
    actions = [
      "ecs:DescribeServices",
      "ecs:UpdateService",
    ]
    resources = [
      for s in var.service_names :
      "arn:aws:ecs:${local.region}:${local.account_id}:service/${var.cluster_name}/${s}"
    ]
  }

  statement {
    sid     = "RunMigration"
    actions = ["ecs:RunTask"]
    # Any revision of the migration family, and no other family.
    resources = [
      "arn:aws:ecs:${local.region}:${local.account_id}:task-definition/${var.migration_task_family}:*",
    ]

    condition {
      test     = "ArnEquals"
      variable = "ecs:cluster"
      values   = ["arn:aws:ecs:${local.region}:${local.account_id}:cluster/${var.cluster_name}"]
    }
  }

  statement {
    sid = "TagWhatItCreates"
    # Lets the workflow put the project and environment tags on the task
    # definition revisions and migration tasks it creates, and on nothing
    # that already exists.
    actions = ["ecs:TagResource"]
    resources = [
      "arn:aws:ecs:${local.region}:${local.account_id}:task-definition/${var.task_family_prefix}*:*",
      "arn:aws:ecs:${local.region}:${local.account_id}:task/${var.cluster_name}/*",
    ]

    condition {
      test     = "StringEquals"
      variable = "ecs:CreateAction"
      values   = ["RegisterTaskDefinition", "RunTask"]
    }
  }

  statement {
    sid       = "WatchTasks"
    actions   = ["ecs:DescribeTasks"]
    resources = ["arn:aws:ecs:${local.region}:${local.account_id}:task/${var.cluster_name}/*"]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "deploy"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}
