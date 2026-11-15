locals {
  dashboards = toset([for file in fileset("${path.module}/dashboards", "*.json") : trimsuffix(file, ".json")])
}

resource "grafana_dashboard" "maxhq" {
  for_each = local.dashboards

  folder      = grafana_folder.maxhq.uid
  config_json = file("${path.module}/dashboards/${each.key}.json")
}
