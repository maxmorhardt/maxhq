provider "grafana" {
  url             = var.url
  auth            = var.auth
  sm_url          = var.sm_url
  sm_access_token = var.sm_access_token
}
