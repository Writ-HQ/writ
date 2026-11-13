variable "name" {
  description = "Name prefix and instance identifier, for example writ-staging."
  type        = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  description = "Private subnets, in at least two availability zones."
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security groups that may connect on 5432, keyed by a short label."
  type        = map(string)
}

variable "engine_version" {
  description = "PostgreSQL version. A major version alone (\"18\") lets RDS choose the minor; pin a full version once confirmed."
  type        = string
}

variable "instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "allocated_storage_gb" {
  type    = number
  default = 20
}

variable "max_allocated_storage_gb" {
  description = "Upper limit for storage autoscaling."
  type        = number
  default     = 100
}

variable "multi_az" {
  description = "Keep a standby in a second zone. Roughly doubles the instance cost."
  type        = bool
  default     = false
}

variable "backup_retention_days" {
  type    = number
  default = 7
}

variable "deletion_protection" {
  type    = bool
  default = true
}

variable "db_name" {
  type    = string
  default = "writ"
}

variable "admin_username" {
  description = "The RDS admin user. Used only by the role bootstrap task; the API and migrations use writ_app and writ_owner."
  type        = string
  default     = "writ_admin"
}
