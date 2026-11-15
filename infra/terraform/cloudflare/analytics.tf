resource "cloudflare_web_analytics_site" "maxhq" {
  account_id   = local.account_id
  zone_tag     = data.cloudflare_zone.account.zone_id
  auto_install = true
}

import {
  to = cloudflare_web_analytics_site.maxhq
  id = "fb109acc7b2dfb19786da3086e08f620/bc32f52766cc4ca89d12538c31b9f1a5"
}
