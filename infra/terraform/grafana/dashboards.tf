resource "grafana_folder" "squares" {
  title = "squares"
}

# the charts ship these for an in-cluster grafana; the same json works here because it picks data sources by variable
resource "grafana_dashboard" "squares" {
  for_each = toset(["accounts", "contests", "games", "realtime"])

  folder      = grafana_folder.squares.uid
  config_json = file("${path.module}/../../../charts/squares-${each.key}/squares-${each.key}-dashboard.json")
  overwrite   = true
}
