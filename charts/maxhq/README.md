# maxhq

Published to `oci://ghcr.io/maxmorhardt/charts/maxhq`, released as `maxhq-chart/<version>`; Argo CD Applications in `gitops` pin the version.

## Required

- **Envoy Gateway** — `maxhq` Gateway in `envoy-gateway-system` (HTTPRoute parentRef)
- **TLS** — terminated at the gateway (`maxhq.io-tls` in `envoy-gateway-system`)
- **DNS** — `maxhq.io` (and `dev.maxhq.io`) to the gateway, from `infra/terraform/cloudflare`

## Optional

- **Prometheus** — metrics on port 9113
- **Cloudflare cache purge** — `cachePurge.enabled` runs a PostSync Job that purges the route hostnames; needs a `cloudflare` secret with `CLOUDFLARE_ZONE_ID` and `CLOUDFLARE_API_TOKEN` (Zone → Cache Purge: Purge)
