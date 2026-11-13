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
  environment         = "staging"
  vpc_cidr            = "10.20.0.0/16"
  domain_name         = "api.staging.example.ca"
  db_engine_version   = "18"
  db_roles_script     = "echo roles"
  github_repository   = "Example-Org/example"
  oidc_issuer         = "https://auth.example.ca"
  oidc_audience       = "writ-api"
  budget_alert_emails = ["alerts@example.ca"]
}

run "defaults" {
  command = plan

  assert {
    condition     = aws_lb_listener.https.protocol == "HTTPS" && aws_lb_listener.http.default_action[0].type == "redirect"
    error_message = "The load balancer must serve HTTPS and redirect HTTP."
  }
  assert {
    condition     = length(module.web) == 0 && length(module.worker) == 0
    error_message = "web and worker must be off by default."
  }
  assert {
    condition     = length(aws_lb_target_group.web) == 0 && length(aws_lb_listener_rule.api) == 0
    error_message = "While web is off, the API is the only target."
  }
  assert {
    condition     = toset([for n in aws_budgets_budget.monthly.notification : n.threshold]) == toset([50, 100, 150])
    error_message = "Budget alerts must be at 50, 100 and 150 USD."
  }
  assert {
    condition     = alltrue([for r in aws_ecr_repository.this : r.image_tag_mutability == "IMMUTABLE"]) && length(aws_ecr_repository.this) == 2
    error_message = "There are two repositories and their tags are immutable."
  }
  assert {
    condition     = length(aws_route53_record.alb) == 0 && length(aws_route53_record.certificate_validation) == 0
    error_message = "Without a hosted zone, no DNS records are created."
  }
  assert {
    condition     = alltrue([for k, r in aws_vpc_security_group_ingress_rule.tasks_from_alb : r.cidr_ipv4 == null])
    error_message = "Tasks accept traffic only from the load balancer's security group."
  }
  assert {
    condition     = aws_secretsmanager_secret.db["app-url"].name == "writ/staging/database/app-url"
    error_message = "Secrets are named by project and environment."
  }
}

run "web_worker_and_route53_on" {
  command = plan

  variables {
    web_enabled     = true
    worker_enabled  = true
    route53_zone_id = "Z0123456789ABCDEFGHIJ"
  }

  assert {
    condition     = length(module.web) == 1 && length(module.worker) == 1
    error_message = "web and worker are created when switched on."
  }
  assert {
    condition     = contains(flatten([for c in aws_lb_listener_rule.api[0].condition : [for p in c.path_pattern : tolist(p.values)]]), "/v1/*")
    error_message = "With web on, /v1/* goes to the API."
  }
  assert {
    condition     = length(aws_route53_record.alb) == 1
    error_message = "With a hosted zone, the domain is pointed at the load balancer."
  }
}

run "production_shape" {
  command = plan

  variables {
    environment                 = "production"
    vpc_cidr                    = "10.30.0.0/16"
    create_github_oidc_provider = false
  }

  assert {
    condition     = aws_ecs_cluster.this.name == "writ-production" && aws_lb.this.name == "writ-production"
    error_message = "A second environment gets its own names from the environment input."
  }
}

run "identity_provider_must_be_https" {
  command = plan

  variables {
    oidc_issuer = "http://auth.example.ca"
  }

  expect_failures = [var.oidc_issuer]
}
