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
- **DNS** — from `infra/terraform/cloudflare`: prod hosts are Cloudflare-proxied records to the prod
  nodes (443 open), dev hosts are DNS-only records to dev's Tailscale IPs

## Header stripping

The `ClientTrafficPolicy` removes `strippedRequestHeaders` from every request before any filter runs. Apps (squares) trust `X-Auth-*` headers that only a `SecurityPolicy` jwt filter sets, so a client must never be able to send them. Keep this list in step with the `claimToHeaders` in the `squares-*` charts' `values.yaml`.

## Origin pulls

With `originPulls.enabled`, the `ClientTrafficPolicy` requires every TLS client to present a certificate signed by Cloudflare's origin-pull CA (`files/cloudflare-origin-pull-ca.pem`, valid until November 2029). Cloudflare presents it once Authenticated Origin Pulls is on for the zone (`infra/terraform/cloudflare`), so anyone who finds a node's IP and skips Cloudflare gets a TLS error. Turn the zone setting on first, then the chart value, or prod refuses Cloudflare too. Dev is DNS-only over Tailscale, so it stays off there.

## Optional

- **cloudflare-cidr** — keeps the trusted CIDR list current for the `ClientTrafficPolicy`
  that resolves real client IPs from `X-Forwarded-For`
