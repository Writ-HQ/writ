output "url" {
  value = module.staging.url
}

output "load_balancer_dns_name" {
  value = module.staging.load_balancer_dns_name
}

output "certificate_validation_records" {
  value = module.staging.certificate_validation_records
}

output "ecr_repository_urls" {
  value = module.staging.ecr_repository_urls
}

output "github_deploy_role_arn" {
  value = module.staging.github_deploy_role_arn
}

output "log_groups" {
  value = module.staging.log_groups
}

output "bootstrap_roles_command" {
  value = module.staging.bootstrap_roles_command
}
