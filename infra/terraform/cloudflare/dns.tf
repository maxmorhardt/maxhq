locals {
  domain = "maxstash.io"

  app_hosts = ["ages", "api", "argocd", "grafana", "login", "olympics", "squares"]

  mx_hosts = {
    "mx.zoho.com"  = 10
    "mx2.zoho.com" = 20
    "mx3.zoho.com" = 50
  }
}

resource "cloudflare_dns_record" "apex" {
  zone_id = var.zone_id
  name    = local.domain
  type    = "A"
  content = var.apex_ip
  proxied = true
  ttl     = 1
}

resource "cloudflare_dns_record" "app" {
  for_each = toset(local.app_hosts)

  zone_id = var.zone_id
  name    = "${each.key}.${local.domain}"
  type    = "CNAME"
  content = local.domain
  proxied = true
  ttl     = 1
}

resource "cloudflare_dns_record" "mx" {
  for_each = local.mx_hosts

  zone_id  = var.zone_id
  name     = local.domain
  type     = "MX"
  content  = each.key
  priority = each.value
  ttl      = 1
}

resource "cloudflare_dns_record" "google_verification" {
  zone_id = var.zone_id
  name    = local.domain
  type    = "TXT"
  content = "\"google-site-verification=eN7R4zHvmZm2R_7zE7PLtkM7-yDMpBabBj5tQDTsGFk\""
  ttl     = 3600
}

resource "cloudflare_dns_record" "spf" {
  zone_id = var.zone_id
  name    = local.domain
  type    = "TXT"
  content = "\"v=spf1 include:zohomail.com ~all\""
  ttl     = 1
}

resource "cloudflare_dns_record" "dkim" {
  zone_id = var.zone_id
  name    = "zmail._domainkey.${local.domain}"
  type    = "TXT"
  content = "\"v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDPvL/FwCzNZevVyMpmp2/3l5Me0vcMW4UQV2idyPqWbJq1jrVZE/iHd2OtYlOBgoM7l6Ia0NGXKfYGlCBO2clC5DziyuGVz7dS8XtUbrCdpE1qXZiX33rRSvxoLKa6cjkoPhgbUrSxL+DpvBnliT+6MtWjTMdPIeVTFIQOc29TUQIDAQAB\""
  ttl     = 1
}
