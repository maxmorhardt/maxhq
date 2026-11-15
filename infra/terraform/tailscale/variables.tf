variable "oauth_client_id" {
  description = "Tailscale OAuth client ID"
  type        = string
  default     = null
}

variable "oauth_client_secret" {
  description = "Tailscale OAuth client secret"
  type        = string
  sensitive   = true
  default     = null
}

variable "api_key" {
  description = "Tailscale API access token, when not using the OAuth client"
  type        = string
  sensitive   = true
  default     = null
}
