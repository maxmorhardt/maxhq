# External Dependencies

## Required

- **PostgreSQL** — 17+, primary and read replica
- **NATS** — pub/sub for cross-instance WebSocket broadcasting
- **Dex** — `squares` static client at `login.maxstash.io`
- **SMTP** — outbound email
- **Envoy Gateway** — `maxstash` Gateway in `envoy-gateway-system` (HTTPRoute parentRef)
- **TLS** — terminated at the gateway (`maxstash.io-tls` in `envoy-gateway-system`)
- **DNS** — `api.maxstash.io` pointed at the gateway external IP (shared API hostname, path
  `/squares`)

## Secrets

`squares-api-env` in the `squares` namespace, consumed via `envFrom`. Sealed into
`secrets/squares/` — see [sealed-secrets](https://github.com/maxmorhardt/k8s/blob/main/sealed-secrets/SETUP.md).

| group | keys |
| --- | --- |
| database | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL_MODE` |
| read replica | the same six with a `DB_READ_` prefix |
| messaging | `NATS_URL` |
| email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SUPPORT_EMAIL` |
| auth | `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `TURNSTILE_SECRET_KEY` |
| http | `ALLOWED_ORIGINS`, `CONTACT_RATE_LIMIT` |

`METRICS_ENABLED` comes from the chart (`metrics.enabled`), not the secret.

## Optional

- **Prometheus** — ServiceMonitor and PrometheusRule ship with the chart
