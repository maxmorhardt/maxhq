variable "api_key" {
  description = "Tailscale API access token"
  type        = string
  sensitive   = true
}

variable "ci_owner" {
  description = "Login that owns tag:ci"
  type        = string
}
