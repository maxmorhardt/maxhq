# External Dependencies

One chart deploys all four squares backend services (`squares-contests`, `squares-games`, `squares-accounts`, `squares-realtime`), each with its own Deployment, Service, HPA, PDB, HTTPRoute, NetworkPolicy, and ServiceMonitor.

## Required

- **PostgreSQL** - 17+, primary and optional read replica. One database; each service migrates its own schema (`contests`, `games`, `accounts`) at startup and adopts the pre-split tables from `public` on first boot.
- **NATS with JetStream** - the `SQUARES` stream is created by whichever service starts first. `NATS_STREAM_REPLICAS` (3) must not exceed the JetStream cluster size.
- **Redis** - shared cache, deleted-account revocation list, contact rate limit, and idempotency records. Services keep working (fail open) if it is briefly unavailable.
- **Dex** - `squares` and `squares-mobile` clients at `login.maxstash.io`. The gateway validates tokens against `https://login.maxstash.io/keys`.
- **SMTP** - outbound email for the contact form (accounts).
- **Envoy Gateway** - `maxstash` Gateway in `envoy-gateway-system` (HTTPRoute parentRef). The gateway's `ClientTrafficPolicy` must strip client-sent `X-Auth-*` headers (see `charts/maxstash-gateway`), because the services trust those headers.
- **TLS** - terminated at the gateway (`maxstash.io-tls` in `envoy-gateway-system`)
- **DNS** - `api.maxstash.io` pointed at the gateway external IP (shared API hostname, path prefix `/squares`)
- **NetworkPolicy enforcement** - k3s enforces NetworkPolicy with its embedded controller. The policies here admit app traffic only from `envoy-gateway-system`, metrics only from `monitoring`, and calls to contests only from accounts and realtime.

## Routing

| Path under `api.maxstash.io/squares` | Service |
| --- | --- |
| `/contests/**`, `/invites/**`, `/leaderboard`, `/stats`, `/users/me/stats`, `/users/me/active-contests` | contests |
| `/games/**` | games |
| `/users/me` (exact), `/contact` | accounts |
| `/events/**` (server-sent events, no request timeout) | realtime |
| `/swagger/<service>` | that service's API reference |

## Secrets

`squares-api-env` in the `squares` namespace, consumed by every service via `envFrom`. Sealed into
`secrets/squares/` - see [sealed-secrets](https://github.com/maxmorhardt/k8s/blob/main/sealed-secrets/SETUP.md).

| group | keys |
| --- | --- |
| database | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL_MODE` |
| read replica | the same six with a `DB_READ_` prefix |
| messaging | `NATS_URL` |
| cache | `REDIS_URL` (`redis://:<password>@redis-master.redis.svc:6379/0`) |
| service-to-service | `INTERNAL_API_TOKEN` (any long random string, shared by all four) |
| email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SUPPORT_EMAIL` |
| captcha | `TURNSTILE_SECRET_KEY` |
| http | `ALLOWED_ORIGINS`, `CONTACT_RATE_LIMIT` |

`OIDC_ISSUER` and `OIDC_CLIENT_ID` are no longer read; the gateway owns token validation.
`SERVER_PORT`, `METRICS_*`, `NATS_STREAM_*`, `CONTESTS_INTERNAL_URL`, and per-service settings come from the chart, not the secret.

## Optional

- **Prometheus** - ServiceMonitors, the `squares-api` PrometheusRule, and the Grafana dashboard ship with the chart
