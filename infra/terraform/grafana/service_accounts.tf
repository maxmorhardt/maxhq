resource "grafana_service_account" "alloy_rules" {
  name = "alloy-rules"
  role = "Admin"
}
