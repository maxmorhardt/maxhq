# External Dependencies

## Required

- **PostgreSQL** — connection supplied via the `olympics-api-env` secret
- **Dex** — `olympics` static client at `login.maxstash.io`
- **Envoy Gateway** — `maxstash` Gateway in `envoy-gateway-system` (HTTPRoute parentRef)
- **TLS** — terminated at the gateway (`maxstash.io-tls` in `envoy-gateway-system`)
- **DNS** — `api.maxstash.io` pointed at the gateway external IP (shared API hostname, path
  `/olympics`)

## Secrets

`olympics-api-env` in the `apps` namespace, consumed via `envFrom`. Sealed into
`secrets/apps/` — see [sealed-secrets](https://github.com/maxmorhardt/k8s/blob/main/sealed-secrets/SETUP.md).

| group | keys |
| --- | --- |
| database | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL_MODE` |
| auth | `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `ADMIN_EMAILS` |
| http | `ALLOWED_ORIGINS`, `SERVER_PORT` |

## Optional

- **Prometheus** — metrics scraping
