locals {
  domains = {
    "maxhq.io" = {
      prod_hosts     = ["", "squares", "api", "login", "olympics", "ages"]
      cached_hosts   = ["", "squares", "olympics"]
      redirect_hosts = ["www"]
      dev            = true
      mx = {
        "mx.zoho.com"  = 10
        "mx2.zoho.com" = 20
        "mx3.zoho.com" = 50
      }
      txt = {
        spf               = { name = "@", content = "v=spf1 include:zohomail.com ~all" }
        dkim              = { name = "zmail._domainkey", content = "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCFuJcABSoyLCjZRieD12iOJvhZ4FyIawPgbanL9k1qJ/H2HZbG0lQvu79EzqAgRCb1ivuC+Wudq/PCh6Rlm94wqmozLRJqsDRBz+InJG2zIVa3yUReyKAKepovHs4rdANGK+pn+19M6XIzHq4eXlIv90FFTAaRj4WuoM3vFl9qEwIDAQAB" }
        zoho_verification = { name = "@", content = "zoho-verification=zb52898871.zmverify.zoho.com" }
        dmarc             = { name = "_dmarc", content = "v=DMARC1; p=quarantine; rua=mailto:support@maxhq.io" }
        notify_dkim       = { name = "1591453._domainkey.notify", content = "k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnFQ6V8vFe5NfZCbn75tpyS5k/7Y5a9F1FsCkhwJEVNb0dtATejjQz148BNUTm2dml/mOrggUQqiFUsdgIIG+vzxSdCddxQkDTxkfTGLoBEhNf2fN346Xd7StX2dQslVQ1VicOVsyC5DcoO8aeZWE1m2BxvZntnGwkVAXZTBCxBU0cHZTFvOcWFCIQavdQotjPavWii4b9oc9jOwzrMh2JCiWrUENYpsEK0DEOCTm1cVd4cLZr4pCkIS20LMua1i8rjGpAaWddjHmnlI6hwmo8a+rcAZcqgLLh+rZjogYDqwgG9Z5Soi5jJGMpmAsOp1rVqXMlAzKHk7IlIJd1zCiUQIDAQAB" }
      }
      cname = {
        notify_bounce = { name = "bounce-zem.notify", content = "cluster89.zeptomail.com" }
      }
    }
  }
}

module "domains" {
  source   = "./modules/domain"
  for_each = toset(keys(local.domains))

  domain         = each.key
  prod_hosts     = try(local.domains[each.key].prod_hosts, [])
  cached_hosts   = try(local.domains[each.key].cached_hosts, [])
  redirect_hosts = try(local.domains[each.key].redirect_hosts, [])
  tunnel_id      = cloudflare_zero_trust_tunnel_cloudflared.prod.id
  dev_ips        = try(local.domains[each.key].dev, false) ? var.dev_ips : []
  mx             = try(local.domains[each.key].mx, {})
  txt            = try(local.domains[each.key].txt, {})
  cname          = try(local.domains[each.key].cname, {})
}
