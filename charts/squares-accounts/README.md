# squares-accounts

Published to `oci://ghcr.io/maxmorhardt/charts/squares-accounts`, released as `squares-accounts-chart/<version>`; Argo CD Applications in `gitops` pin the version.

The `squares-accounts` service: one Deployment, Service, HPA, PDB, HTTPRoute, SecurityPolicy, BackendTrafficPolicy, NetworkPolicy, ServiceMonitor, and PrometheusRule.

## Required

- **PostgreSQL** - 17+, primary and optional read replica. One database shared by the squares services; this service migrates only its own `accounts` schema at startup (and adopts the pre-split `users`, `deleted_accounts`, and `contact_submissions` tables from `public` on the first start after the split).
- **Valkey** (the `valkey` namespace) - the users stream, the revocation list (written here on deletion and rebuilt from Postgres on every start), and idempotency records.
- **squares-contests** - its `/internal` routes, at `CONTESTS_INTERNAL_URL` with `INTERNAL_API_TOKEN`.
- **SMTP** - outbound email for the contact form.
- **Cloudflare Turnstile** - verifies the contact form captcha.
- **Envoy Gateway** - the `maxhq` Gateway in `envoy-gateway-system` (HTTPRoute parentRef). Its `ClientTrafficPolicy` must strip client-sent `X-Auth-*` and `X-Internal-Token` headers (see `charts/gateway`), because the service trusts them.
- **Dex** - `squares` and `squares-mobile` clients at `login.maxhq.io`. The chart's `SecurityPolicy` validates tokens against `https://login.maxhq.io/keys`.
- **NetworkPolicy enforcement** - k3s enforces NetworkPolicy with its embedded controller. The policy admits app traffic only from `envoy-gateway-system` and metrics only from `monitoring`.
- **TLS** and **DNS** - `api.maxhq.io` on the gateway, TLS terminated there.

## Routing

| Path under `api.maxhq.io/squares` | |
| --- | --- |
| `/users/me` | get (creating the profile on first sign-in), update initials, delete the account |
| `/contact` | the public contact form, behind Turnstile; the gateway limits it to 10 a day per client (`route.rateLimit.rules`) |
| `/swagger/accounts` | the API reference |

## Secrets

`squares-accounts-env` in the `squares` namespace, read with `envFrom` (override the name with `secretName`). Sealed into
`clusters/<cluster>/secrets/squares/` in the gitops repo; see [sealed-secrets](https://github.com/maxmorhardt/gitops/blob/main/infrastructure/sealed-secrets/README.md).

| group | keys |
| --- | --- |
| database | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL_MODE` |
| read replica | the same six with a `DB_READ_` prefix (optional) |
| redis | `REDIS_URL` |
| service-to-service | `INTERNAL_API_TOKEN` (the same value in contests, accounts, and realtime) |
| email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SUPPORT_EMAIL` |
| captcha | `TURNSTILE_SECRET_KEY` |
| http | `ALLOWED_ORIGINS` |

`REDIS_URL` is `redis://squares:<password>@valkey-master.valkey.svc:6379/0`, the `squares` ACL user from the gitops repo's `valkey-users` secret.
`SERVER_PORT` and `METRICS_*` come from the chart; other settings go in `env` in `values.yaml` (see the service's `.env.example` in the maxhq repo for each one and its default).

## Optional

- **Prometheus** - the ServiceMonitor and PrometheusRule ship with the chart; Grafana Alloy scrapes the one and syncs the other to Grafana Cloud. The dashboard lives in gitops, `infrastructure/monitoring/dashboards/`.
