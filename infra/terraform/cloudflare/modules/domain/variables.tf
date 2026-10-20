variable "domain" {
  description = "Zone name, which must already exist in the Cloudflare account"
  type        = string
}

variable "prod_hosts" {
  description = "Hosts proxied to the prod nodes; \"\" is the apex"
  type        = list(string)
  default     = []
}

variable "prod_ips" {
  description = "Public IPs of the prod nodes"
  type        = list(string)
  sensitive   = true
}

variable "dev_ips" {
  description = "Tailscale IPs of dev's nodes for dev.<domain> and *.dev.<domain>; empty for no dev records"
  type        = list(string)
  default     = []
}

variable "mx" {
  description = "Mail servers and their priorities"
  type        = map(number)
  default     = {}
}

variable "txt" {
  description = "TXT records by key: name relative to the zone (\"@\" for the apex) and unquoted content"
  type = map(object({
    name    = string
    content = string
  }))
  default = {}
}

variable "origin_pulls" {
  description = "Present Cloudflare's client certificate to the origin, so the gateway can refuse anything that skips Cloudflare"
  type        = bool
  default     = false
}

variable "api_rate_limit" {
  description = "Requests per IP per 10 seconds api.<domain> accepts before blocking; 0 for no limit"
  type        = number
  default     = 0
}

variable "block_scanners" {
  description = "Block probes for paths no app here serves (php, wp-*, dotfiles)"
  type        = bool
  default     = false
}
