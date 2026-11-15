variable "url" {
  description = "Grafana Cloud stack URL"
  type        = string
  default     = "https://maxhqio.grafana.net"
}

variable "sm_url" {
  description = "Synthetic Monitoring API for the stack's region"
  type        = string
  default     = "https://synthetic-monitoring-api-us-east-0.grafana.net"
}

variable "auth" {
  description = "Service account token with the Admin role"
  type        = string
  sensitive   = true
}

variable "sm_access_token" {
  description = "Synthetic Monitoring access token"
  type        = string
  sensitive   = true
}

variable "telegram_bot_token" {
  description = "Token of the @maxhqio_bot Telegram bot"
  type        = string
  sensitive   = true
}

variable "telegram_chat_id" {
  description = "Telegram chat alerts are sent to"
  type        = string
  default     = "8753214944"
}

variable "postgres_password" {
  description = "Password of the grafana Postgres role (cnpg-database/postgres-grafana-user)"
  type        = string
  sensitive   = true
}

variable "pdc_network_id" {
  description = "Private data source connect network the Postgres data source goes through"
  type        = string
  default     = "8baa7271-2819-4e85-9552-38ee0e8a140f"
}
