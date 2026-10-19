data "cloudflare_zone" "maxhq" {
  filter = {
    name = local.domain
  }
}

locals {
  domain     = "maxhq.io"
  zone_id    = data.cloudflare_zone.maxhq.zone_id
  account_id = data.cloudflare_zone.maxhq.account.id

  mx_hosts = {
    "mx.zoho.com"  = 10
    "mx2.zoho.com" = 20
    "mx3.zoho.com" = 50
  }
}

resource "cloudflare_dns_record" "mail_mx" {
  for_each = local.mx_hosts

  zone_id  = local.zone_id
  name     = local.domain
  type     = "MX"
  content  = each.key
  priority = each.value
  ttl      = 1
}

resource "cloudflare_dns_record" "mail_spf" {
  zone_id = local.zone_id
  name    = local.domain
  type    = "TXT"
  content = "\"v=spf1 include:zohomail.com ~all\""
  ttl     = 1
}

resource "cloudflare_dns_record" "mail_dkim" {
  zone_id = local.zone_id
  name    = "zmail._domainkey.${local.domain}"
  type    = "TXT"
  content = "\"v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCFuJcABSoyLCjZRieD12iOJvhZ4FyIawPgbanL9k1qJ/H2HZbG0lQvu79EzqAgRCb1ivuC+Wudq/PCh6Rlm94wqmozLRJqsDRBz+InJG2zIVa3yUReyKAKepovHs4rdANGK+pn+19M6XIzHq4eXlIv90FFTAaRj4WuoM3vFl9qEwIDAQAB\""
  ttl     = 1
}

resource "cloudflare_dns_record" "zoho_verification" {
  zone_id = local.zone_id
  name    = local.domain
  type    = "TXT"
  content = "\"zoho-verification=zb52898871.zmverify.zoho.com\""
  ttl     = 1
}

# the old domain keeps its records until it expires; Terraform just stops tracking them
removed {
  from = cloudflare_dns_record.apex
  lifecycle {
    destroy = false
  }
}

removed {
  from = cloudflare_dns_record.app
  lifecycle {
    destroy = false
  }
}

removed {
  from = cloudflare_dns_record.mx
  lifecycle {
    destroy = false
  }
}

removed {
  from = cloudflare_dns_record.google_verification
  lifecycle {
    destroy = false
  }
}

removed {
  from = cloudflare_dns_record.spf
  lifecycle {
    destroy = false
  }
}

removed {
  from = cloudflare_dns_record.dkim
  lifecycle {
    destroy = false
  }
}
