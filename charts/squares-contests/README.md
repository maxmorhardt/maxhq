# squares-contests

Published to `oci://ghcr.io/maxmorhardt/charts/squares-contests`, released as `squares-contests-chart/<version>`; Argo CD Applications in `gitops` pin the version.

The `squares-contests` service: one Deployment, Service, HPA, PDB, HTTPRoute, SecurityPolicy, BackendTrafficPolicy, NetworkPolicy, ServiceMonitor, and PrometheusRule.

## Required

- **PostgreSQL** - 17+, primary and optional read replica. One database shared by the squares services; this service migrates only its own `contests` schema at startup (on the first start after the split it also adopts the pre-split contest tables from `public` and seeds its copies of users and games from them).
- **Valkey** (the `valkey` namespace) - contest streams, leaderboard and stats caches, idempotency records, and the revocation list.
- **Envoy Gateway** - the `maxhq` Gateway in `envoy-gateway-system` (HTTPRoute parentRef). Its `ClientTrafficPolicy` must strip client-sent `X-Auth-*` and `X-Internal-Token` headers (see `charts/gateway`), because the service trusts them.
- **Dex** - `squares` and `squares-mobile` clients at `login.maxhq.io`. The chart's `SecurityPolicy` validates tokens against `https://login.maxhq.io/keys`.
- **NetworkPolicy enforcement** - k3s enforces NetworkPolicy with its embedded controller. The policy admits app traffic only from `envoy-gateway-system`, plus `/internal` calls from `squares-accounts` and `squares-realtime` and metrics only from `monitoring`.
- **TLS** and **DNS** - `api.maxhq.io` on the gateway, TLS terminated there.

## Routing

| Path under `api.maxhq.io/squares` | |
| --- | --- |
| `/contests/**` | create, edit, start, score, and delete contests; claim and clear squares |
| `/invites/**` | preview and redeem invite links |
| `/leaderboard`, `/stats` | public stats, cached in Valkey |
| `/users/me/stats`, `/users/me/active-contests` | the signed-in user's contest activity |
| `/swagger/contests` | the API reference |

## Secrets

`squares-contests-env` in the `squares` namespace, read with `envFrom` (override the name with `secretName`). Sealed into
`clusters/<cluster>/secrets/squares/` in the gitops repo; see [sealed-secrets](https://github.com/maxmorhardt/gitops/blob/main/infrastructure/sealed-secrets/README.md).

| group | keys |
| --- | --- |
| database | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL_MODE` |
| read replica | the same six with a `DB_READ_` prefix (optional) |
| redis | `REDIS_URL` |
| service-to-service | `INTERNAL_API_TOKEN` (the same value in contests, accounts, and realtime) |
| http | `ALLOWED_ORIGINS` |

`REDIS_URL` is `redis://squares:<password>@valkey-master.valkey.svc:6379/0`, the `squares` ACL user from the gitops repo's `valkey-users` secret.
`SERVER_PORT` and `METRICS_*` come from the chart; other settings go in `env` in `values.yaml` (see the service's `.env.example` in the maxhq repo for each one and its default).

## Optional

- **Prometheus** - the ServiceMonitor and PrometheusRule ship with the chart