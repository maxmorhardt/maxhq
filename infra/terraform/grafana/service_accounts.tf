resource "grafana_service_account" "alloy_rules" {
  name = "alloy-rules"
  role = "Admin"
}

import {
  to = grafana_service_account.alloy_rules
  id = "20"
}
