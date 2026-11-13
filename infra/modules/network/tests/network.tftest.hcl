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
  name     = "writ-test"
  vpc_cidr = "10.20.0.0/16"
}

run "subnets" {
  command = plan

  assert {
    condition     = length(aws_subnet.public) == 2 && length(aws_subnet.private) == 2
    error_message = "Expected public and private subnets in two zones."
  }
  assert {
    condition     = alltrue([for s in concat(aws_subnet.public, aws_subnet.private) : s.map_public_ip_on_launch != true])
    error_message = "No subnet may assign public addresses automatically."
  }
  assert {
    condition     = length(setintersection(aws_subnet.public[*].cidr_block, aws_subnet.private[*].cidr_block)) == 0
    error_message = "Public and private subnet ranges must not overlap."
  }
  assert {
    condition     = length(aws_nat_gateway.this) == 1
    error_message = "One NAT gateway by default."
  }
}
