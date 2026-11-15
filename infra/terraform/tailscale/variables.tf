variable "oauth_client_id" {
  description = "Tailscale OAuth client ID"
  type        = string
}

variable "oauth_client_secret" {
  description = "Tailscale OAuth client secret"
  type        = string
  sensitive   = true
}
