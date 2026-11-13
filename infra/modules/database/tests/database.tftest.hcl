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
  name                       = "writ-test"
  vpc_id                     = "vpc-0123456789abcdef0"
  subnet_ids                 = ["subnet-0aaaaaaaaaaaaaaaa", "subnet-0bbbbbbbbbbbbbbbb"]
  allowed_security_group_ids = { tasks = "sg-0123456789abcdef0" }
  engine_version             = "18"
}

run "private_encrypted_and_backed_up" {
  command = plan

  assert {
    condition     = aws_db_instance.this.publicly_accessible == false
    error_message = "The database must not be publicly accessible."
  }
  assert {
    condition     = aws_db_instance.this.storage_encrypted == true
    error_message = "Database storage must be encrypted."
  }
  assert {
    condition     = aws_db_instance.this.backup_retention_period == 7
    error_message = "Automated backups must be kept for 7 days by default."
  }
  assert {
    condition     = aws_db_instance.this.deletion_protection == true && aws_db_instance.this.skip_final_snapshot == false
    error_message = "The database must be protected from deletion and snapshotted if deleted."
  }
  assert {
    condition     = aws_db_instance.this.manage_master_user_password == true
    error_message = "The admin password must be managed by RDS, not Terraform."
  }
  assert {
    condition     = anytrue([for p in aws_db_parameter_group.this.parameter : p.name == "rds.force_ssl" && p.value == "1"])
    error_message = "The database must refuse unencrypted connections."
  }
  assert {
    condition     = aws_db_parameter_group.this.family == "postgres18"
    error_message = "The parameter group family must follow the engine's major version."
  }
  assert {
    condition     = length(aws_vpc_security_group_ingress_rule.postgres) == 1 && aws_vpc_security_group_ingress_rule.postgres["tasks"].cidr_ipv4 == null
    error_message = "Only the named security group may reach the database, never an address range."
  }
}

run "backups_cannot_be_turned_off" {
  command = plan

  variables {
    backup_retention_days = 0
  }

  expect_failures = [aws_db_instance.this]
}
