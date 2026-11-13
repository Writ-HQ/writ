variable "name" {
  description = "Name prefix for every resource, for example writ-staging."
  type        = string
}

variable "vpc_cidr" {
  description = "IPv4 range of the VPC. Must not overlap another environment's if they are ever peered."
  type        = string
}

variable "az_count" {
  description = "Number of availability zones. The load balancer and RDS need at least two."
  type        = number
  default     = 2

  validation {
    condition     = var.az_count >= 2 && var.az_count <= 4
    error_message = "az_count must be between 2 and 4."
  }
}

variable "single_nat_gateway" {
  description = "Use one NAT gateway for all zones. Cheaper, but outbound traffic stops if its zone fails."
  type        = bool
  default     = true
}
