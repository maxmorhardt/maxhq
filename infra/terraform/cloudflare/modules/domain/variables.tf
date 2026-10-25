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

variable "cached_hosts" {
  description = "Prod hosts serving prebuilt pages whose HTML is cached at the edge; \"\" is the apex"
  type        = list(string)
  default     = []
}

variable "cache_edge_ttl" {
  description = "Seconds Cloudflare keeps cached HTML; the Free plan's minimum is 7200"
  type        = number
  default     = 7200
}
