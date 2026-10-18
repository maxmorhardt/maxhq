# External Dependencies

## Required

- **Envoy Gateway** — `maxstash` Gateway in `envoy-gateway-system` (HTTPRoute parentRef)
- **TLS** — terminated at the gateway (`maxhq.io-tls` in `envoy-gateway-system`)
- **DNS** — `squares.maxhq.io` pointed at the gateway external IP
- **squares services** (`squares-contests`, `squares-games`, `squares-accounts`, `squares-realtime`) — the backend this UI talks to, all under `api.maxhq.io/squares`

## Optional

- **Prometheus** — metrics on port 9113
