variable "name" {
  description = "Full name, for example writ-staging-api. Used for the service, task family, task role and log group."
  type        = string
}

variable "container_name" {
  description = "Short name of the container, for example api."
  type        = string
}

variable "cluster_arn" {
  type = string
}

variable "image" {
  description = "Image for the first revision. Later revisions come from the deploy workflow."
  type        = string
}

variable "execution_role_arn" {
  description = "Role ECS uses to pull the image, write logs and read the secrets listed in var.secrets."
  type        = string
}

variable "cpu" {
  description = "Fargate CPU units (256 = 0.25 vCPU)."
  type        = number
  default     = 256
}

variable "memory" {
  description = "Fargate memory in MiB."
  type        = number
  default     = 512
}

variable "entry_point" {
  description = "Overrides the image's entrypoint when set."
  type        = list(string)
  default     = null
}

variable "command" {
  type    = list(string)
  default = null
}

variable "environment" {
  description = "Plain environment variables. Never put credentials here; use secrets."
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Environment variable name to Secrets Manager ARN (optionally with a :json-key:: suffix)."
  type        = map(string)
  default     = {}
}

variable "container_port" {
  description = "Port the container listens on, or null for a workload that serves no traffic."
  type        = number
  default     = null
}

variable "readonly_root_filesystem" {
  type    = bool
  default = true
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "create_service" {
  description = "False for a one-off task (migration, bootstrap) that is started with run-task."
  type        = bool
  default     = true
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "subnet_ids" {
  description = "Private subnets for the service's tasks."
  type        = list(string)
  default     = []
}

variable "security_group_ids" {
  type    = list(string)
  default = []
}

variable "target_group_arn" {
  description = "Load balancer target group to register with, or null."
  type        = string
  default     = null
}
