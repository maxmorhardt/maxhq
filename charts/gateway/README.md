# gateway

Published to `oci://ghcr.io/maxmorhardt/charts/gateway`, released as `gateway-chart/<version>`; Argo CD Applications in `gitops` pin the version.

Provides the `maxhq` GatewayClass and Gateway that every other chart's HTTPRoute attaches
to, so this deploys before the apps.

## Required

- **Envoy Gateway controller** — installed from the `gitops` repo into `envoy-gateway-system`,
  along with the Gateway API CRDs
- **TLS** — the secret named by `tls.secretName` in `envoy-gateway-system`, covering `<domain>` and
  `*.<domain>`: the Cloudflare origin certificate `maxhq.io-tls` in prod, cert-manager's
  `dev.maxhq.io-tls` in dev
- **DNS** — from `infra/terraform/cloudflare`: prod hosts are Cloudflare-proxied records to the
  prod tunnel, dev hosts are DNS-only records to dev's Tailscale IPs

## Tunnel

`tunnel.enabled` runs cloudflared next to the proxy. It dials out to Cloudflare, and Cloudflare
sends every proxied host through it to the proxy's Service, so the nodes need no public port.

- **Token**: the secret `tunnel.tokenSecret.name` in `envoy-gateway-system`, holding the token from
  `terraform output -raw prod_tunnel_token` in `infra/terraform/cloudflare`.
- **Routing**: the tunnel's ingress rules live in Terraform, not here. They send each host to the
  proxy's Service over HTTPS, with SNI set to the requested host, and verify the proxy's Cloudflare
  origin certificate against the Origin CA root this chart mounts.
- **Client IPs**: the proxy sees cloudflared's pod IP, which is inside the trusted pod CIDR, so
  `X-Forwarded-For` still resolves to the visitor.

Prod sets `proxy.service.type: ClusterIP`, so nothing listens on the nodes' public IPs. Dev keeps
`LoadBalancer`, since its hosts resolve to the nodes' Tailscale IPs. Closing a port in ufw alone
would not do it: ServiceLB's hostPort is NAT'd past ufw's input rules.

## Header stripping

The `ClientTrafficPolicy` removes `strippedRequestHeaders` from every request before any filter runs. Apps (squares) trust `X-Auth-*` headers that only a `SecurityPolicy` jwt filter sets, so a client must never be able to send them. Keep this list in step with the `claimToHeaders` in the `squares-*` charts' `values.yaml`.
