variable "dev_ips" {
  description = "Tailscale IPs of dev's nodes, so dev hostnames only route on the tailnet"
  type        = list(string)
}
