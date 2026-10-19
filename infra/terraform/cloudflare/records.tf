variable "prod_ips" {
  description = "Public IPs of the prod nodes, behind proxied records so they never resolve publicly"
  type        = list(string)
  sensitive   = true
}

locals {
  # Tailscale IPs of dev's control plane: public names that only route on the tailnet
  dev_ips = ["100.89.41.36", "100.73.221.89", "100.87.45.127"]

  # "" is the apex
  prod_hosts = ["", "squares", "api", "login", "argocd", "olympics", "ages"]

  prod_records = {
    for pair in setproduct(local.prod_hosts, range(nonsensitive(length(var.prod_ips)))) :
    "${pair[0] == "" ? "@" : pair[0]}-${pair[1]}" => {
      name  = pair[0] == "" ? local.domain : "${pair[0]}.${local.domain}"
      index = pair[1]
    }
  }

  dev_records = {
    for pair in setproduct(["dev", "*.dev"], range(length(local.dev_ips))) :
    "${pair[0]}-${pair[1]}" => {
      name = "${pair[0]}.${local.domain}"
      ip   = local.dev_ips[pair[1]]
    }
  }
}

resource "cloudflare_dns_record" "prod" {
  for_each = local.prod_records

  zone_id = local.zone_id
  name    = each.value.name
  type    = "A"
  content = var.prod_ips[each.value.index]
  proxied = true
  ttl     = 1
}

resource "cloudflare_dns_record" "dev" {
  for_each = local.dev_records

  zone_id = local.zone_id
  name    = each.value.name
  type    = "A"
  content = each.value.ip
  proxied = false
  ttl     = 300
}
