# Plans without credentials; nothing is created.
# Run with `terraform init -backend=false && terraform test`.

# This test uses the real provider with placeholder credentials, because
# the policy documents are computed locally by the provider and the point
# is to check the real JSON. A plan of new resources makes no AWS calls;
# the one lookup that would (the account ID) is overridden.
provider "aws" {
  region                      = "ca-central-1"
  access_key                  = "placeholder"
  secret_key                  = "placeholder"
  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true
}

override_data {
  target          = data.aws_caller_identity.current
  override_during = plan
  values = {
    account_id = "123456789012"
  }
}

variables {
  name              = "writ-test-github-deploy"
  github_repository = "Example-Org/example"
  # Reuse an existing provider, so that its ARN is known at plan time and
  # the trust policy can be checked.
  create_oidc_provider  = false
  ecr_repository_arns   = ["arn:aws:ecr:ca-central-1:123456789012:repository/writ-test-api"]
  cluster_name          = "writ-test"
  service_names         = ["writ-test-api"]
  migration_task_family = "writ-test-migrate"
  task_family_prefix    = "writ-test-"
  passable_role_arns    = ["arn:aws:iam::123456789012:role/writ-test-api-task"]
}

run "least_privilege" {
  command = plan

  assert {
    condition     = jsondecode(data.aws_iam_policy_document.trust.json).Statement[0].Condition.StringEquals["token.actions.githubusercontent.com:sub"] == "repo:Example-Org/example:ref:refs/heads/main"
    error_message = "Only the main branch of the one repository may assume the role."
  }
  assert {
    condition     = !can(jsondecode(data.aws_iam_policy_document.trust.json).Statement[0].Condition.StringLike)
    error_message = "The trust policy must not use wildcards."
  }
  assert {
    # Only the three actions that do not support resource-level
    # permissions may apply to every resource.
    condition = toset(flatten([
      for s in jsondecode(data.aws_iam_policy_document.deploy.json).Statement :
      s.Action if s.Resource == "*"
    ])) == toset(["ecr:GetAuthorizationToken", "ecs:DescribeTaskDefinition", "ecs:RegisterTaskDefinition"])
    error_message = "Only actions without resource-level permissions may use Resource *."
  }
  assert {
    condition = [
      for s in jsondecode(data.aws_iam_policy_document.deploy.json).Statement :
      s.Resource if s.Sid == "RunMigration"
    ] == ["arn:aws:ecs:ca-central-1:123456789012:task-definition/writ-test-migrate:*"]
    error_message = "The role may run only the migration task."
  }
  assert {
    condition = [
      for s in jsondecode(data.aws_iam_policy_document.deploy.json).Statement :
      s.Resource if s.Sid == "PassRoles"
    ] == ["arn:aws:iam::123456789012:role/writ-test-api-task"]
    error_message = "The role may pass only the roles it is given."
  }
  assert {
    condition = alltrue([
      for s in jsondecode(data.aws_iam_policy_document.deploy.json).Statement :
      !anytrue([for a in flatten([s.Action]) : startswith(a, "secretsmanager:") || startswith(a, "rds:") || endswith(a, ":*")])
    ])
    error_message = "The role must not read secrets, touch RDS or hold wildcard actions."
  }
}
