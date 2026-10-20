# squares

Published to `oci://ghcr.io/maxmorhardt/charts/squares`, released as `squares-chart/<version>`; Argo CD Applications in `gitops` pin the version.

## Required

- **Envoy Gateway** — `maxhq` Gateway in `envoy-gateway-system` (HTTPRoute parentRef)
- **TLS** — terminated at the gateway (`maxhq.io-tls` in `envoy-gateway-system`)
- **DNS** — `squares.maxhq.io` (and `squares.dev.maxhq.io`) to the gateway, from `infra/terraform/cloudflare`
- **squares services** (`squares-contests`, `squares-games`, `squares-accounts`, `squares-realtime`) — the backend this UI talks to, all under `api.maxhq.io/squares`

## Optional

- **Prometheus** — metrics on port 9113
