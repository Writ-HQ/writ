output "address" {
  description = "Host name of the instance, resolvable only inside the VPC."
  value       = aws_db_instance.this.address
}

output "port" {
  value = aws_db_instance.this.port
}

output "db_name" {
  value = aws_db_instance.this.db_name
}

output "admin_username" {
  value = aws_db_instance.this.username
}

output "admin_secret_arn" {
  description = "Secrets Manager secret, managed by RDS, holding the admin password."
  value       = aws_db_instance.this.master_user_secret[0].secret_arn
}

output "security_group_id" {
  value = aws_security_group.this.id
}
