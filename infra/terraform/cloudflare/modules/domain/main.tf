terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
    }
  }
}

data "cloudflare_zone" "this" {
  filter = {
    name = var.domain
  }
}

locals {
  zone_id = data.cloudflare_zone.this.zone_id

  prod_records = {
    for pair in setproduct(var.prod_hosts, range(nonsensitive(length(var.prod_ips)))) :
    "${pair[0] == "" ? "@" : pair[0]}-${pair[1]}" => {
      name  = pair[0] == "" ? var.domain : "${pair[0]}.${var.domain}"
      index = pair[1]
    }
  }

  dev_records = {
    for pair in setproduct(["dev", "*.dev"], range(length(var.dev_ips))) :
    "${pair[0]}-${pair[1]}" => {
      name = "${pair[0]}.${var.domain}"
      ip   = var.dev_ips[pair[1]]
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

resource "cloudflare_dns_record" "mx" {
  for_each = var.mx

  zone_id  = local.zone_id
  name     = var.domain
  type     = "MX"
  content  = each.key
  priority = each.value
  ttl      = 1
}

resource "cloudflare_dns_record" "txt" {
  for_each = var.txt

  zone_id = local.zone_id
  name    = each.value.name == "@" ? var.domain : "${each.value.name}.${var.domain}"
  type    = "TXT"
  content = "\"${each.value.content}\""
  ttl     = 1
}

resource "cloudflare_authenticated_origin_pulls_settings" "this" {
  count = var.origin_pulls ? 1 : 0

  zone_id = local.zone_id
  enabled = true
}

# a zone has one ruleset per phase, so these own their phases outright
resource "cloudflare_ruleset" "rate_limit" {
  count = var.api_rate_limit > 0 ? 1 : 0

  zone_id = local.zone_id
  name    = "rate limits"
  kind    = "zone"
  phase   = "http_ratelimit"

  rules = [
    {
      ref         = "api_per_ip"
      description = "Block an IP that floods the API"
      expression  = "(http.host eq \"api.${var.domain}\")"
      action      = "block"
      ratelimit = {
        characteristics     = ["ip.src", "cf.colo.id"]
        period              = 10
        requests_per_period = var.api_rate_limit
        mitigation_timeout  = 10
      }
    },
  ]
}

resource "cloudflare_ruleset" "custom" {
  count = var.block_scanners ? 1 : 0

  zone_id = local.zone_id
  name    = "custom rules"
  kind    = "zone"
  phase   = "http_request_firewall_custom"

  rules = [
    {
      ref         = "block_scanners"
      description = "Block probes for paths no app here serves"
      expression  = "(ends_with(http.request.uri.path, \".php\")) or (http.request.uri.path contains \"/wp-\") or (http.request.uri.path contains \"/.env\") or (http.request.uri.path contains \"/.git\")"
      action      = "block"
    },
  ]
}
