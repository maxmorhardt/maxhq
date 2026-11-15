resource "grafana_folder" "maxhq" {
  uid   = "fbmdf4"
  title = "maxhq"
}

resource "grafana_folder" "repo_alerts" {
  uid   = "repo-alerts"
  title = "repo alerts"

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = grafana_folder.maxhq
  id = "fbmdf4"
}

import {
  to = grafana_folder.repo_alerts
  id = "repo-alerts"
}
