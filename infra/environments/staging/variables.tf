variable "domain_name" {
  description = "Host name for staging, for example api.staging.example.ca."
  type        = string
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone that holds domain_name, or null to add the DNS records by hand."
  type        = string
  default     = null
}

variable "budget_alert_emails" {
  description = "Addresses that receive the 50, 100 and 150 USD budget alerts."
  type        = list(string)
}

variable "api_desired_count" {
  description = "Set to 0 for the first apply, before any image has been pushed."
  type        = number
  default     = 1
}

variable "oidc_issuer" {
  description = "Issuer URL of the staging Zitadel instance."
  type        = string
}

variable "oidc_audience" {
  description = "Audience required in access tokens: the Zitadel project ID or the application's client ID."
  type        = string
}
