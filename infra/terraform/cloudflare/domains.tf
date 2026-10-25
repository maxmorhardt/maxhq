locals {
  domains = {
    "maxhq.io" = {
      prod_hosts   = ["", "squares", "api", "login", "argocd", "olympics", "ages"]
      cached_hosts = ["", "squares"]
      dev          = true
      mx = {
        "mx.zoho.com"  = 10
        "mx2.zoho.com" = 20
        "mx3.zoho.com" = 50
      }
      txt = {
        spf               = { name = "@", content = "v=spf1 include:zohomail.com ~all" }
        dkim              = { name = "zmail._domainkey", content = "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCFuJcABSoyLCjZRieD12iOJvhZ4FyIawPgbanL9k1qJ/H2HZbG0lQvu79EzqAgRCb1ivuC+Wudq/PCh6Rlm94wqmozLRJqsDRBz+InJG2zIVa3yUReyKAKepovHs4rdANGK+pn+19M6XIzHq4eXlIv90FFTAaRj4WuoM3vFl9qEwIDAQAB" }
        zoho_verification = { name = "@", content = "zoho-verification=zb52898871.zmverify.zoho.com" }
      }
    }
  }
}

module "domains" {
  source   = "./modules/domain"
  for_each = toset(keys(local.domains))

  domain       = each.key
  prod_hosts   = try(local.domains[each.key].prod_hosts, [])
  cached_hosts = try(local.domains[each.key].cached_hosts, [])
  prod_ips     = var.prod_ips
  dev_ips      = try(local.domains[each.key].dev, false) ? var.dev_ips : []
  mx           = try(local.domains[each.key].mx, {})
  txt          = try(local.domains[each.key].txt, {})
}

moved {
  from = cloudflare_dns_record.prod
  to   = module.domains["maxhq.io"].cloudflare_dns_record.prod
}

moved {
  from = cloudflare_dns_record.dev
  to   = module.domains["maxhq.io"].cloudflare_dns_record.dev
}

moved {
  from = cloudflare_dns_record.mail_mx
  to   = module.domains["maxhq.io"].cloudflare_dns_record.mx
}

moved {
  from = cloudflare_dns_record.mail_spf
  to   = module.domains["maxhq.io"].cloudflare_dns_record.txt["spf"]
}

moved {
  from = cloudflare_dns_record.mail_dkim
  to   = module.domains["maxhq.io"].cloudflare_dns_record.txt["dkim"]
}

moved {
  from = cloudflare_dns_record.zoho_verification
  to   = module.domains["maxhq.io"].cloudflare_dns_record.txt["zoho_verification"]
}
