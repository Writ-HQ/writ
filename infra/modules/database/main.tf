# RDS PostgreSQL in private subnets. It has no public address, accepts
# connections only from the security groups it is given, and refuses
# connections that are not encrypted.

terraform {
  required_version = ">= 1.11"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

locals {
  major_version = split(".", var.engine_version)[0]
}

resource "aws_db_subnet_group" "this" {
  name       = var.name
  subnet_ids = var.subnet_ids
}

resource "aws_security_group" "this" {
  name        = "${var.name}-database"
  description = "PostgreSQL, reachable only from the application tasks"
  vpc_id      = var.vpc_id

  tags = { Name = "${var.name}-database" }
}

resource "aws_vpc_security_group_ingress_rule" "postgres" {
  for_each = var.allowed_security_group_ids

  security_group_id            = aws_security_group.this.id
  description                  = "PostgreSQL from ${each.key}"
  referenced_security_group_id = each.value
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}

resource "aws_db_parameter_group" "this" {
  name_prefix = "${var.name}-pg${local.major_version}-"
  family      = "postgres${local.major_version}"
  description = "Writ: TLS required"

  # Refuse any connection that is not encrypted.
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_instance" "this" {
  identifier = var.name

  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  db_name  = var.db_name
  username = var.admin_username
  # RDS generates the admin password, stores it in Secrets Manager and
  # rotates it. It never appears in Terraform state. Only the role
  # bootstrap task reads it.
  manage_master_user_password = true

  allocated_storage     = var.allocated_storage_gb
  max_allocated_storage = var.max_allocated_storage_gb
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.this.id]
  publicly_accessible    = false
  multi_az               = var.multi_az
  port                   = 5432
  parameter_group_name   = aws_db_parameter_group.this.name
  ca_cert_identifier     = "rds-ca-rsa2048-g1"

  backup_retention_period   = var.backup_retention_days
  backup_window             = "07:00-08:00" # UTC; the small hours in Canada
  maintenance_window        = "sun:08:30-sun:09:30"
  copy_tags_to_snapshot     = true
  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.name}-final"

  auto_minor_version_upgrade      = true
  allow_major_version_upgrade     = false
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  lifecycle {
    precondition {
      condition     = var.backup_retention_days >= 1
      error_message = "Automated backups must stay on: backup_retention_days must be at least 1."
    }
  }
}
