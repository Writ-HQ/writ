output "url" {
  value = "https://${var.domain_name}"
}

output "load_balancer_dns_name" {
  description = "Point the domain here (CNAME) when DNS is not in Route 53."
  value       = aws_lb.this.dns_name
}

output "certificate_validation_records" {
  description = "DNS records that prove ownership of the domain. Add them by hand when DNS is not in Route 53."
  value = [
    for o in aws_acm_certificate.this.domain_validation_options : {
      name  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }
  ]
}

output "ecr_repository_urls" {
  value = { for k, r in aws_ecr_repository.this : k => r.repository_url }
}

output "github_deploy_role_arn" {
  description = "Set as the GitHub Actions variable AWS_DEPLOY_ROLE_ARN."
  value       = module.github_deploy.role_arn
}

output "cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "log_groups" {
  value = merge(
    {
      api             = module.api.log_group_name
      migrate         = module.migrate.log_group_name
      bootstrap-roles = module.bootstrap_roles.log_group_name
    },
    { for m in module.web : "web" => m.log_group_name },
    { for m in module.worker : "worker" => m.log_group_name },
  )
}

output "database_address" {
  description = "Reachable only from inside the VPC."
  value       = module.database.address
}

output "bootstrap_roles_command" {
  description = "Creates the database roles. See the runbook before running it."
  value = join(" ", [
    "aws ecs run-task",
    "--region ${local.region}",
    "--cluster ${aws_ecs_cluster.this.name}",
    "--task-definition ${module.bootstrap_roles.family}",
    "--launch-type FARGATE",
    "--network-configuration 'awsvpcConfiguration={subnets=[${join(",", module.network.private_subnet_ids)}],securityGroups=[${aws_security_group.tasks.id}],assignPublicIp=DISABLED}'",
  ])
}
