variable "project" {
  type    = string
  default = "writ"
}

variable "environment" {
  description = "Environment name, for example staging or production. Part of every resource name."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9]{1,14}$", var.environment))
    error_message = "environment must be 2 to 15 lowercase letters or digits, starting with a letter."
  }
}

# --- Network ---------------------------------------------------------------

variable "vpc_cidr" {
  type = string
}

variable "single_nat_gateway" {
  description = "One NAT gateway instead of one per zone. Set false for production."
  type        = bool
  default     = true
}

# --- Domain ----------------------------------------------------------------

variable "domain_name" {
  description = "Host name the load balancer serves, for example api.staging.example.ca."
  type        = string
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone for domain_name. Null when DNS is hosted elsewhere and the records are added by hand."
  type        = string
  default     = null
}

# --- Database --------------------------------------------------------------

variable "db_engine_version" {
  description = "PostgreSQL version for RDS."
  type        = string
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_allocated_storage_gb" {
  type    = number
  default = 20
}

variable "db_multi_az" {
  type    = bool
  default = false
}

variable "db_backup_retention_days" {
  type    = number
  default = 7
}

variable "db_credentials_version" {
  description = "Raise by one to generate new passwords for writ_owner and writ_app. Follow the rotation steps in the runbook."
  type        = number
  default     = 1
}

variable "db_roles_script" {
  description = "Contents of api/db/initdb/01-roles.sh, the script that creates the database roles."
  type        = string
}

variable "postgres_client_image" {
  description = "Image with psql, used by the role bootstrap task. Keep the major version in step with the database."
  type        = string
  default     = "public.ecr.aws/docker/library/postgres:18-alpine"
}

variable "deletion_protection" {
  description = "Protect the database and the load balancer from deletion."
  type        = bool
  default     = true
}

# --- Identity provider -----------------------------------------------------

variable "oidc_issuer" {
  description = "Issuer URL of the identity provider (Zitadel), for example https://auth.example.ca. The API accepts only tokens from it."
  type        = string

  validation {
    condition     = startswith(var.oidc_issuer, "https://")
    error_message = "oidc_issuer must be an https URL."
  }
}

variable "oidc_audience" {
  description = "Audience the API requires in access tokens: the Zitadel project ID or the application's client ID."
  type        = string
}

# --- Workloads -------------------------------------------------------------

variable "initial_image_tag" {
  description = "Image tag in the task definitions Terraform registers. The deploy workflow replaces it with the commit being deployed."
  type        = string
  default     = "bootstrap"
}

variable "log_level" {
  type    = string
  default = "info"
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "container_insights" {
  description = "ECS Container Insights. Adds CloudWatch cost."
  type        = bool
  default     = false
}

variable "ecr_images_to_keep" {
  type    = number
  default = 30
}

variable "api_desired_count" {
  description = "Number of API tasks. Set 0 for the very first apply, before any image exists."
  type        = number
  default     = 1
}

variable "api_cpu" {
  type    = number
  default = 256
}

variable "api_memory" {
  type    = number
  default = 512
}

variable "web_enabled" {
  description = "Run the web service. While false, all traffic goes to the API."
  type        = bool
  default     = false
}

variable "web_desired_count" {
  type    = number
  default = 1
}

variable "web_cpu" {
  type    = number
  default = 256
}

variable "web_memory" {
  type    = number
  default = 512
}

variable "web_health_check_path" {
  type    = string
  default = "/"
}

variable "worker_enabled" {
  description = "Run the background worker service."
  type        = bool
  default     = false
}

variable "worker_desired_count" {
  type    = number
  default = 1
}

variable "worker_cpu" {
  type    = number
  default = 256
}

variable "worker_memory" {
  type    = number
  default = 512
}

# --- Deploys ---------------------------------------------------------------

variable "github_repository" {
  description = "owner/name of the GitHub repository that deploys to this environment."
  type        = string
}

variable "deploy_branch" {
  type    = string
  default = "main"
}

variable "create_github_oidc_provider" {
  description = "False when another environment in the same AWS account already created the GitHub OIDC provider."
  type        = bool
  default     = true
}

# --- Budget ----------------------------------------------------------------

variable "budget_alert_emails" {
  description = "Addresses that receive budget alerts."
  type        = list(string)

  validation {
    condition     = length(var.budget_alert_emails) > 0
    error_message = "Give at least one address for budget alerts."
  }
}

variable "budget_alert_thresholds_usd" {
  description = "Actual monthly spend, in US dollars, at which to send an alert."
  type        = list(number)
  default     = [50, 100, 150]
}

variable "budget_filter_by_environment_tag" {
  description = "Count only resources tagged with this environment. Requires the cost allocation tag to be activated first."
  type        = bool
  default     = false
}
