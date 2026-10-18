# External Dependencies

## Required

- **Envoy Gateway** — `maxstash` Gateway in `envoy-gateway-system` (HTTPRoute parentRef)
- **TLS** — terminated at the gateway (`maxhq.io-tls` in `envoy-gateway-system`)
- **DNS** — `maxhq.io` pointed at the gateway external IP

## Optional

- **Prometheus** — metrics on port 9113
