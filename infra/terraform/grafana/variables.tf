variable "grafana_url" {
  description = "Grafana Cloud stack URL, e.g. https://maxhq.grafana.net"
  type        = string
}

variable "grafana_auth" {
  description = "Service account token with the Admin role on the stack"
  type        = string
  sensitive   = true
}

variable "sm_url" {
  description = "Synthetic Monitoring API URL for the stack's region"
  type        = string
}

variable "sm_access_token" {
  description = "Synthetic Monitoring access token"
  type        = string
  sensitive   = true
}

variable "discord_webhook_url" {
  description = "Discord webhook every alert is sent to"
  type        = string
  sensitive   = true
}

variable "prometheus_datasource_uid" {
  description = "UID of the stack's Prometheus data source that k8s-monitoring writes to"
  type        = string
  default     = "grafanacloud-prom"
}

variable "probes" {
  description = "Synthetic Monitoring probe locations each uptime check runs from"
  type        = list(string)
  default     = ["Ohio", "Frankfurt"]
}
