resource "aws_budgets_budget" "backups" {
  name              = "S3 Backup Budget"
  budget_type       = "COST"
  limit_amount      = "20.0"
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2026-01-01_00:00"
  time_period_end   = "2087-06-15_00:00"
  billing_view_arn  = "arn:aws:billing::${var.account_id}:billingview/primary"

  dynamic "notification" {
    for_each = [0, 25, 50, 75, 100]
    content {
      comparison_operator        = "GREATER_THAN"
      notification_type          = "ACTUAL"
      threshold                  = notification.value
      threshold_type             = "PERCENTAGE"
      subscriber_email_addresses = [var.budget_email]
    }
  }

  lifecycle {
    ignore_changes = [metrics]
  }
}

import {
  to = aws_budgets_budget.backups
  id = "${var.account_id}:S3 Backup Budget"
}
