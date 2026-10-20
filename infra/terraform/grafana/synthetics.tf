data "grafana_synthetic_monitoring_probes" "all" {}

locals {
  # five checks from two probes every five minutes stays inside the free tier's 100k executions a month
  uptime_checks = {
    maxhq       = "https://maxhq.io"
    squares     = "https://squares.maxhq.io"
    squares-api = "https://api.maxhq.io/squares/stats"
    login       = "https://login.maxhq.io/.well-known/openid-configuration"
    olympics    = "https://olympics.maxhq.io"
  }
}

resource "grafana_synthetic_monitoring_check" "uptime" {
  for_each = local.uptime_checks

  job       = each.key
  target    = each.value
  enabled   = true
  frequency = 300000
  timeout   = 10000
  probes    = [for name in var.probes : data.grafana_synthetic_monitoring_probes.all.probes[name]]
  labels = {
    env = "prod"
  }

  settings {
    http {
      method             = "GET"
      fail_if_not_ssl    = true
      valid_status_codes = [200]
    }
  }
}
