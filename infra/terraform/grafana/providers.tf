provider "grafana" {
  url                            = var.url
  auth                           = var.auth
  sm_url                         = var.sm_url
  sm_access_token                = var.sm_access_token
  cloud_access_policy_token      = var.cloud_access_policy_token
  frontend_o11y_api_access_token = var.cloud_access_policy_token
}
