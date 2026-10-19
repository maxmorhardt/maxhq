# records created by hand before Terraform managed them; delete this file after the next apply

import {
  for_each = {
    "@-0"       = "6ab6dc11098ea5575cb200cad317f056"
    "@-1"       = "a440ca415fffdfe74159cccd03a4fe15"
    "@-2"       = "c8347434e2fdbaf7d4c1eb841b2d892f"
    "api-0"     = "8a05949da932b684735c006aa2b19bd1"
    "api-1"     = "2d57e20b9c320c33f0be24a664e3cab7"
    "api-2"     = "db749a422917c5628b1beaf21990e483"
    "argocd-0"  = "72c49ed24e99af4f597c4e506b6aebda"
    "argocd-1"  = "e7b297052a7a37659eb9d79a476e9e18"
    "argocd-2"  = "c4713448719855695405d41f10fdde49"
    "login-0"   = "467c5558924f92dc7571173b263359ee"
    "login-1"   = "30a69f65aec0efa971aad6a7ce11cad1"
    "login-2"   = "422be0c5d01773851c08df86983cca3c"
    "squares-0" = "a38861a68b9aa9ee255e9542214747f7"
    "squares-1" = "f18e106fc30be01216a13ed50e4dfd7d"
    "squares-2" = "14cdc51c8f55ea23a7c7599cd9b30d0b"
  }
  to = cloudflare_dns_record.prod[each.key]
  id = "${local.zone_id}/${each.value}"
}

import {
  for_each = {
    "*.dev-0" = "ef5dbdd0bde10b13d1c9e7cb88952cdf"
    "*.dev-1" = "8dc7981386caf33e716933b4e2117682"
    "*.dev-2" = "46a42f178e8a9c03630a8bc6ed2800bb"
    "dev-0"   = "fa55ac14826f4b72f975e48c1f6dc4d3"
    "dev-1"   = "8896a1f6b8d0089bc3b329cddbbca6ae"
    "dev-2"   = "af714037671685ff785bdcb046cca9cb"
  }
  to = cloudflare_dns_record.dev[each.key]
  id = "${local.zone_id}/${each.value}"
}

import {
  for_each = {
    "mx.zoho.com"  = "e89fe3d857445fea0de28c777d282f6d"
    "mx2.zoho.com" = "07aa586c8e79e29519f6ffdf40f08524"
    "mx3.zoho.com" = "3c6460946d85aef9784e5c3bf0183cc6"
  }
  to = cloudflare_dns_record.mail_mx[each.key]
  id = "${local.zone_id}/${each.value}"
}

import {
  to = cloudflare_dns_record.mail_dkim
  id = "${local.zone_id}/e24cd8be32360fb7bb5d961e711e3fc2"
}

import {
  to = cloudflare_dns_record.mail_spf
  id = "${local.zone_id}/941c7be6b6e42897ef216e2a0b19072d"
}

import {
  to = cloudflare_dns_record.zoho_verification
  id = "${local.zone_id}/008882e7b9a07195587d44184e82b69a"
}
