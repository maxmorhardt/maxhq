locals {
  # "" is the apex; dev gets <host>-dev, and dev.maxhq.io for its apex, so the free *.maxhq.io certificate covers both
  hosts = ["", "squares", "api", "login", "argocd"]

  environments = {
    prod = ""
    dev  = "-dev"
  }

  hostnames = {
    for env, suffix in local.environments : env => [
      for host in local.hosts :
      host == "" ? (suffix == "" ? local.domain : "dev.${local.domain}") : "${host}${suffix}.${local.domain}"
    ]
  }

  # the gateway's in-cluster Service; envoy routes by Host, so SNI follows it
  gateway = "https://envoy-maxhq.envoy-gateway-system.svc.cluster.local:443"
}

resource "cloudflare_zero_trust_tunnel_cloudflared" "cluster" {
  for_each = local.environments

  account_id = local.account_id
  name       = "maxhq-${each.key}"
  config_src = "cloudflare"
}

resource "cloudflare_zero_trust_tunnel_cloudflared_config" "cluster" {
  for_each = local.environments

  account_id = local.account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.cluster[each.key].id

  config = {
    ingress = concat(
      [
        for hostname in local.hostnames[each.key] : {
          hostname = hostname
          service  = local.gateway
          origin_request = {
            # the origin certificate is only trusted by Cloudflare's edge
            no_tls_verify     = true
            match_sn_ito_host = true
          }
        }
      ],
      [{ service = "http_status:404" }],
    )
  }
}

resource "cloudflare_dns_record" "tunnel" {
  for_each = merge([
    for env, hostnames in local.hostnames : { for hostname in hostnames : hostname => env }
  ]...)

  zone_id = local.zone_id
  name    = each.key
  type    = "CNAME"
  content = "${cloudflare_zero_trust_tunnel_cloudflared.cluster[each.value].id}.cfargotunnel.com"
  proxied = true
  ttl     = 1
}

data "cloudflare_zero_trust_tunnel_cloudflared_token" "cluster" {
  for_each = local.environments

  account_id = local.account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.cluster[each.key].id
}

output "tunnel_tokens" {
  description = "cloudflared token per cluster: terraform output -json tunnel_tokens"
  value       = { for env, token in data.cloudflare_zero_trust_tunnel_cloudflared_token.cluster : env => token.token }
  sensitive   = true
}
