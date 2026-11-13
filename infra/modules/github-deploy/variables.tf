variable "name" {
  description = "Role name, for example writ-staging-github-deploy."
  type        = string
}

variable "github_repository" {
  description = "owner/name of the repository allowed to assume the role."
  type        = string
}

variable "branch" {
  description = "The only branch allowed to assume the role."
  type        = string
  default     = "main"
}

variable "create_oidc_provider" {
  description = "Create the account's GitHub OIDC provider. False if another environment in the same account already did."
  type        = bool
  default     = true
}

variable "ecr_repository_arns" {
  description = "Repositories the role may push to."
  type        = list(string)
}

variable "cluster_name" {
  type = string
}

variable "service_names" {
  description = "ECS services the role may update. A service that does not exist yet may be listed."
  type        = list(string)
}

variable "migration_task_family" {
  description = "The one task definition family the role may run."
  type        = string
}

variable "passable_role_arns" {
  description = "Exactly the execution and task roles that deployed task definitions use."
  type        = list(string)
}

variable "task_family_prefix" {
  description = "Prefix shared by the environment's task definition families, for example writ-staging-."
  type        = string
}
