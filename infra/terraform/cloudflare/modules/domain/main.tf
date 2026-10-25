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

# cache html at edge
resource "cloudflare_ruleset" "cache" {
  count = length(var.cached_hosts) > 0 ? 1 : 0

  zone_id = local.zone_id
  name    = "Cache static sites"
  kind    = "zone"
  phase   = "http_request_cache_settings"

  rules = [{
    ref         = "cache_static_html"
    description = "Edge-cache prebuilt pages; hashed /assets/ keep their origin headers"
    expression = format(
      "(http.host in {%s} and not starts_with(http.request.uri.path, \"/assets/\"))",
      join(" ", [for h in var.cached_hosts : "\"${h == "" ? var.domain : "${h}.${var.domain}"}\""])
    )
    action  = "set_cache_settings"
    enabled = true
    action_parameters = {
      cache = true
      edge_ttl = {
        mode    = "override_origin"
        default = var.cache_edge_ttl
        status_code_ttl = [{
          status_code_range = { from = 300, to = 599 }
          value             = -1
        }]
      }
      browser_ttl = {
        mode = "respect_origin"
      }
      cache_key = {
        custom_key = {
          query_string = {
            exclude = { all = true }
          }
        }
      }
    }
  }]
}
