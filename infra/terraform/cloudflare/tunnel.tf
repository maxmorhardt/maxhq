# every zone lives in this one account, so any of them names it
data "cloudflare_zone" "account" {
  filter = {
    name = "maxhq.io"
  }
}

locals {
  account_id = data.cloudflare_zone.account.account.id

  # the gateway chart's proxy Service in prod (proxy.service.name)
  gateway_origin = "https://envoy-maxhq.envoy-gateway-system.svc.cluster.local:443"

  # SNI follows the requested host so Envoy picks the matching listener, and its origin certificate
  # is checked against the Origin CA root the gateway chart mounts into cloudflared
  gateway_origin_request = {
    match_sn_ito_host = true
    ca_pool           = "/etc/cloudflared/origin-ca/origin_ca_rsa_root.pem"
  }
}

# prod's cloudflared dials out over this, so the prod nodes need no public port
resource "cloudflare_zero_trust_tunnel_cloudflared" "prod" {
  account_id = local.account_id
  name       = "prod"
  config_src = "cloudflare"
}

resource "cloudflare_zero_trust_tunnel_cloudflared_config" "prod" {
  account_id = local.account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.prod.id

  config = {
    ingress = concat(
      flatten([
        for domain in keys(local.domains) : [
          for hostname in [domain, "*.${domain}"] : {
            hostname       = hostname
            service        = local.gateway_origin
            origin_request = local.gateway_origin_request
          }
        ]
      ]),
      [{ service = "http_status:404" }],
    )
  }
}

data "cloudflare_zero_trust_tunnel_cloudflared_token" "prod" {
  account_id = local.account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.prod.id
}

output "prod_tunnel_token" {
  description = "Sealed into gitops as envoy-gateway-system/cloudflared-token for the gateway chart's cloudflared"
  value       = data.cloudflare_zero_trust_tunnel_cloudflared_token.prod.token
  sensitive   = true
}
