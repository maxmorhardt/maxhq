# External Dependencies

## Required

- **Envoy Gateway** — `maxstash` Gateway in `envoy-gateway-system` (HTTPRoute parentRef)
- **TLS** — terminated at the gateway (`maxstash.io-tls` in `envoy-gateway-system`)
- **DNS** — `olympics.maxstash.io` pointed at the gateway external IP
- **olympics-api** — the backend this UI talks to

## Optional

- **Prometheus** — metrics on port 9113
