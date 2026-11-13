# Emails when the month's actual spend passes each threshold.
#
# By default this watches the whole AWS account, which is right while the
# account holds one environment. With several environments in one account,
# set budget_filter_by_environment_tag and activate "environment" as a
# cost allocation tag in the Billing console; until that tag is activated
# a filtered budget sees no spend and never alerts.

resource "aws_budgets_budget" "monthly" {
  name         = "${local.name}-monthly"
  budget_type  = "COST"
  time_unit    = "MONTHLY"
  limit_unit   = "USD"
  limit_amount = tostring(max(var.budget_alert_thresholds_usd...))

  dynamic "cost_filter" {
    for_each = var.budget_filter_by_environment_tag ? [1] : []
    content {
      name   = "TagKeyValue"
      values = [format("user:environment$%s", var.environment)]
    }
  }

  dynamic "notification" {
    for_each = toset(var.budget_alert_thresholds_usd)
    content {
      notification_type          = "ACTUAL"
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "ABSOLUTE_VALUE"
      subscriber_email_addresses = var.budget_alert_emails
    }
  }
}
