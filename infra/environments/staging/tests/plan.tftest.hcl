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
  domain_name         = "api.staging.example.ca"
  budget_alert_emails = ["alerts@example.ca"]
  oidc_issuer         = "https://auth.example.ca"
  oidc_audience       = "writ-api"
}

run "staging_plans" {
  command = plan

  assert {
    condition     = output.url == "https://api.staging.example.ca"
    error_message = "Staging must be served over HTTPS at the given domain."
  }
}
