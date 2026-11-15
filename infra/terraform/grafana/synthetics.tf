locals {
  checks = {
    maxhq       = { id = 172510, target = "https://maxhq.io", slow_ms = 2500 }
    squares     = { id = 172511, target = "https://squares.maxhq.io", slow_ms = 2500 }
    login       = { id = 172512, target = "https://login.maxhq.io/.well-known/openid-configuration", slow_ms = 3000 }
    squares-api = { id = 172513, target = "https://api.maxhq.io/squares/stats", slow_ms = 3000 }
  }
}

data "grafana_synthetic_monitoring_probes" "main" {}

resource "grafana_synthetic_monitoring_check" "http" {
  for_each = local.checks

  job                = each.key
  target             = each.value.target
  enabled            = true
  frequency          = 300000
  timeout            = 4000
  basic_metrics_only = true
  alert_sensitivity  = "none"
  folder_uid         = grafana_folder.maxhq.uid
  probes = [
    data.grafana_synthetic_monitoring_probes.main.probes.NorthCalifornia,
    data.grafana_synthetic_monitoring_probes.main.probes.NorthVirginia,
  ]

  settings {
    http {
      ip_version          = "V4"
      method              = "GET"
      no_follow_redirects = false
      fail_if_ssl         = false
      fail_if_not_ssl     = true
      valid_status_codes  = [200]
      valid_http_versions = ["HTTP/1.0", "HTTP/1.1", "HTTP/2.0"]
    }
  }
}

resource "grafana_synthetic_monitoring_check_alerts" "http" {
  for_each = local.checks

  check_id = grafana_synthetic_monitoring_check.http[each.key].id

  alerts = [
    {
      name        = "ProbeFailedExecutionsTooHigh"
      threshold   = 3
      period      = "10m"
      runbook_url = ""
    },
    {
      name        = "TLSTargetCertificateCloseToExpiring"
      threshold   = 14
      period      = ""
      runbook_url = ""
    },
    {
      name        = "HTTPRequestDurationTooHighAvg"
      threshold   = each.value.slow_ms
      period      = "15m"
      runbook_url = ""
    },
  ]
}

import {
  for_each = local.checks
  to       = grafana_synthetic_monitoring_check.http[each.key]
  id       = each.value.id
}

import {
  for_each = local.checks
  to       = grafana_synthetic_monitoring_check_alerts.http[each.key]
  id       = each.value.id
}
