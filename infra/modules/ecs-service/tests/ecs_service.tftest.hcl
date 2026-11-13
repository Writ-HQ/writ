# Plans against a mocked AWS provider: no credentials, nothing created.
# Run with `terraform init -backend=false && terraform test`.

mock_provider "aws" {
  # The provider checks that policies are JSON even when mocked.
  mock_data "aws_iam_policy_document" {
    defaults = {
      json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}"
    }
  }
  mock_data "aws_availability_zones" {
    defaults = {
      names = ["ca-central-1a", "ca-central-1b", "ca-central-1d"]
    }
  }
  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "123456789012"
    }
  }
  mock_data "aws_region" {
    defaults = {
      region = "ca-central-1"
    }
  }
}

variables {
  name               = "writ-test-api"
  container_name     = "api"
  cluster_arn        = "arn:aws:ecs:ca-central-1:123456789012:cluster/writ-test"
  image              = "123456789012.dkr.ecr.ca-central-1.amazonaws.com/writ-test-api:bootstrap"
  execution_role_arn = "arn:aws:iam::123456789012:role/writ-test-app-execution"
  container_port     = 8080
  subnet_ids         = ["subnet-0aaaaaaaaaaaaaaaa"]
  security_group_ids = ["sg-0123456789abcdef0"]
  secrets            = { DATABASE_URL = "arn:aws:secretsmanager:ca-central-1:123456789012:secret:example" }
  environment        = { PORT = "8080" }
}

run "service" {
  command = plan

  assert {
    condition     = aws_ecs_service.this[0].network_configuration[0].assign_public_ip == false
    error_message = "Tasks must not have public addresses."
  }
  assert {
    condition     = aws_ecs_service.this[0].deployment_circuit_breaker[0].rollback == true
    error_message = "A failed deployment must roll back by itself."
  }
  assert {
    condition     = jsondecode(aws_ecs_task_definition.this.container_definitions)[0].secrets[0].name == "DATABASE_URL"
    error_message = "Secrets must be injected by reference."
  }
  assert {
    condition     = !strcontains(jsonencode(jsondecode(aws_ecs_task_definition.this.container_definitions)[0].environment), "DATABASE_URL")
    error_message = "Credentials must not appear as plain environment variables."
  }
  assert {
    condition     = aws_cloudwatch_log_group.this.name == "/writ/test/api" && aws_cloudwatch_log_group.this.retention_in_days == 30
    error_message = "Logs go to a named group with a retention period."
  }
}

run "one_off_task" {
  command = plan

  variables {
    create_service = false
    container_port = null
    entry_point    = ["/migrate"]
    command        = ["up"]
  }

  assert {
    condition     = length(aws_ecs_service.this) == 0
    error_message = "A one-off task has no service."
  }
  assert {
    condition     = jsondecode(aws_ecs_task_definition.this.container_definitions)[0].entryPoint == ["/migrate"]
    error_message = "The entrypoint override must reach the container definition."
  }
}
