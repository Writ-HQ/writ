terraform {
  # 1.11 for write-only arguments, which keep the database passwords out
  # of the state file.
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

  # Remote state in S3, created by ../../bootstrap. The bucket name is
  # given at init time: terraform init -backend-config=backend.hcl
  backend "s3" {
    key          = "staging/terraform.tfstate"
    region       = "ca-central-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  # All data stays in Canada.
  region = "ca-central-1"

  default_tags {
    tags = {
      project     = "writ"
      environment = "staging"
    }
  }
}
