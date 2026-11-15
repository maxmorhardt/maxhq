resource "cloudflare_web_analytics_site" "maxhq" {
  account_id   = local.account_id
  zone_tag     = data.cloudflare_zone.account.zone_id
  auto_install = true
}
