resource "grafana_contact_point" "alerts" {
  name               = "alerts"
  disable_provenance = true

  telegram {
    token                    = var.telegram_bot_token
    chat_id                  = var.telegram_chat_id
    disable_notifications    = false
    disable_resolve_message  = false
    disable_web_page_preview = false
    protect_content          = false
  }
}

resource "grafana_notification_policy" "root" {
  contact_point      = grafana_contact_point.alerts.name
  group_by           = ["alertname", "cluster"]
  group_wait         = "30s"
  group_interval     = "5m"
  repeat_interval    = "4h"
  disable_provenance = true

  policy {
    contact_point = "empty"

    matcher {
      label = "severity"
      match = "="
      value = "info"
    }
  }
}

resource "grafana_rule_group" "usage" {
  name               = "usage"
  folder_uid         = grafana_folder.maxhq.uid
  interval_seconds   = 300
  disable_provenance = true

  rule {
    name           = "Metrics near free tier limit"
    uid            = "cg25nwb66k7b4a"
    condition      = "C"
    for            = "15m0s"
    no_data_state  = "OK"
    exec_err_state = "OK"

    labels = {
      severity = "warning"
    }

    annotations = {
      summary     = "Over 9,000 active metric series, close to the free tier's 10,000"
      description = "Run count by (cluster) ({__name__=~\".+\"}) to see which cluster grew, then trim its allowlist in gitops infrastructure/monitoring/values.yaml."
      runbook_url = "https://github.com/maxmorhardt/gitops/blob/main/infrastructure/monitoring/README.md"
    }

    data {
      ref_id         = "A"
      datasource_uid = "grafanacloud-usage"

      relative_time_range {
        from = 600
        to   = 0
      }

      model = jsonencode({
        datasource   = { type = "prometheus", uid = "grafanacloud-usage" }
        editorMode   = "code"
        expr         = "max(grafanacloud_instance_active_series)"
        hide         = false
        instant      = true
        legendFormat = "__auto"
        range        = false
        refId        = "A"
      })
    }

    data {
      ref_id         = "C"
      datasource_uid = "__expr__"
      query_type     = "expression"

      relative_time_range {
        from = 0
        to   = 0
      }

      model = jsonencode({
        conditions = [{
          evaluator = { params = [9000], type = "gt" }
          operator  = { type = "and" }
          query     = { params = ["C"] }
          reducer   = { params = [], type = "last" }
          type      = "query"
        }]
        datasource = { type = "__expr__", uid = "__expr__" }
        expression = "A"
        refId      = "C"
        type       = "threshold"
      })
    }

    notification_settings {
      contact_point = grafana_contact_point.alerts.name
    }
  }
}

import {
  to = grafana_contact_point.alerts
  id = "alerts"
}

import {
  to = grafana_notification_policy.root
  id = "policy"
}

import {
  to = grafana_rule_group.usage
  id = "fbmdf4:usage"
}
