variable "prod_ips" {
  description = "Public IPs of the prod nodes, behind proxied records so they never resolve publicly"
  type        = list(string)
  sensitive   = true
}

variable "dev_ips" {
  description = "Tailscale IPs of dev's nodes, so dev hostnames only route on the tailnet"
  type        = list(string)
}
