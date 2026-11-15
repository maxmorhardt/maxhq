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
