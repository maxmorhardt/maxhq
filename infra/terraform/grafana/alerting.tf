resource "grafana_folder" "alerts" {
  title = "maxhq alerts"
}

resource "grafana_contact_point" "discord" {
  name = "discord"

  discord {
    url                  = var.discord_webhook_url
    use_discord_username = true
  }
}

resource "grafana_notification_policy" "this" {
  contact_point   = grafana_contact_point.discord.name
  group_by        = ["alertname", "cluster"]
  group_wait      = "30s"
  group_interval  = "5m"
  repeat_interval = "4h"
}

locals {
  # each query returns a series only while something is wrong, so any result fires the alert
  alerts = {
    "Node not ready" = {
      expr    = "kube_node_status_condition{condition=\"Ready\", status=\"true\"} == 0"
      for     = "5m"
      summary = "{{ $labels.node }} in {{ $labels.cluster }} has not been Ready for 5 minutes"
    }
    "Pod crash looping" = {
      expr    = "increase(kube_pod_container_status_restarts_total[15m]) > 3"
      for     = "5m"
      summary = "{{ $labels.namespace }}/{{ $labels.pod }} restarted more than 3 times in 15 minutes"
    }
    "Disk almost full" = {
      expr    = "1 - node_filesystem_avail_bytes{fstype!~\"tmpfs|overlay|squashfs\"} / node_filesystem_size_bytes{fstype!~\"tmpfs|overlay|squashfs\"} > 0.8"
      for     = "15m"
      summary = "{{ $labels.mountpoint }} on {{ $labels.instance }} is over 80% full"
    }
    "Certificate expiring" = {
      expr    = "certmanager_certificate_expiration_timestamp_seconds - time() < 14 * 86400"
      for     = "1h"
      summary = "{{ $labels.namespace }}/{{ $labels.name }} expires in under 14 days"
    }
    "Gateway 5xx spike" = {
      expr    = "sum by (cluster) (rate(envoy_cluster_upstream_rq_xx{envoy_response_code_class=\"5\"}[5m])) / sum by (cluster) (rate(envoy_cluster_upstream_rq_total[5m])) > 0.05"
      for     = "5m"
      summary = "More than 5% of requests through the gateway in {{ $labels.cluster }} are failing"
    }
    "Postgres backup failed" = {
      expr    = "cnpg_collector_last_failed_backup_timestamp > cnpg_collector_last_available_backup_timestamp"
      for     = "10m"
      summary = "The last Postgres backup in {{ $labels.cluster }} failed"
    }
    "Postgres backup stale" = {
      expr    = "time() - cnpg_collector_last_available_backup_timestamp > 26 * 3600"
      for     = "1h"
      summary = "No Postgres backup in {{ $labels.cluster }} for over 26 hours"
    }
    "Argo CD app degraded" = {
      expr    = "argocd_app_info{health_status=~\"Degraded|Missing|Unknown\"} == 1"
      for     = "15m"
      summary = "{{ $labels.name }} in {{ $labels.cluster }} is {{ $labels.health_status }}"
    }
    "Argo CD app out of sync" = {
      expr    = "argocd_app_info{sync_status=\"OutOfSync\"} == 1"
      for     = "30m"
      summary = "{{ $labels.name }} in {{ $labels.cluster }} has been OutOfSync for 30 minutes"
    }
    "Site down" = {
      expr    = "sum by (job) (probe_all_success_sum) / sum by (job) (probe_all_success_count) < 0.5"
      for     = "5m"
      summary = "{{ $labels.job }} is failing most of its uptime checks"
    }
  }
}

resource "grafana_rule_group" "platform" {
  name             = "platform"
  folder_uid       = grafana_folder.alerts.uid
  interval_seconds = 60

  dynamic "rule" {
    for_each = local.alerts

    content {
      name           = rule.key
      condition      = "B"
      for            = rule.value.for
      no_data_state  = "OK"
      exec_err_state = "Alerting"
      annotations = {
        summary = rule.value.summary
      }

      data {
        ref_id         = "A"
        datasource_uid = var.prometheus_datasource_uid
        relative_time_range {
          from = 600
          to   = 0
        }
        model = jsonencode({
          refId   = "A"
          expr    = rule.value.expr
          instant = true
        })
      }

      data {
        ref_id         = "B"
        datasource_uid = "__expr__"
        relative_time_range {
          from = 0
          to   = 0
        }
        model = jsonencode({
          refId      = "B"
          type       = "threshold"
          expression = "A"
          conditions = [{ evaluator = { type = "gt", params = [0] } }]
        })
      }
    }
  }
}
