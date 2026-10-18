# External Dependencies

The `squares-games` service: one Deployment, Service, HPA, PDB, HTTPRoute, SecurityPolicy, BackendTrafficPolicy, NetworkPolicy, ServiceMonitor, PrometheusRule, and Grafana dashboard.

## Required

- **PostgreSQL** - 17+, primary and optional read replica. One database shared by the squares services; this service migrates only its own `games` schema at startup (and adopts the pre-split `games` and `game_scores` tables from `public` on the first start after the split).
- **Valkey** (the `valkey` namespace) - the games stream, the upcoming-games cache, and the revocation list.
- **ESPN** - `site.api.espn.com`, public and unauthenticated.
- **Envoy Gateway** - the `maxstash` Gateway in `envoy-gateway-system` (HTTPRoute parentRef). Its `ClientTrafficPolicy` must strip client-sent `X-Auth-*` and `X-Internal-Token` headers (see `charts/maxstash-gateway`), because the service trusts them.
- **Dex** - `squares` and `squares-mobile` clients at `login.maxstash.io`. The chart's `SecurityPolicy` validates tokens against `https://login.maxstash.io/keys`.
- **NetworkPolicy enforcement** - k3s enforces NetworkPolicy with its embedded controller. The policy admits app traffic only from `envoy-gateway-system` and metrics only from `monitoring`.
- **TLS** and **DNS** - `api.maxstash.io` on the gateway, TLS terminated there.

## Routing

| Path under `api.maxstash.io/squares` | |
| --- | --- |
| `/games/upcoming` | the next slate of games a contest can be linked to, cached in Valkey |
| `/swagger/games` | the API reference |

## Secrets

`squares-games-env` in the `squares` namespace, read with `envFrom` (override the name with `secretName`). Sealed into
`argocd/secrets/squares/` in the infra repo; see [sealed-secrets](https://github.com/maxmorhardt/gitops/blob/main/sealed-secrets/SETUP.md).

| group | keys |
| --- | --- |
| database | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL_MODE` |
| read replica | the same six with a `DB_READ_` prefix (optional) |
| redis | `REDIS_URL` |
| http | `ALLOWED_ORIGINS` |

`REDIS_URL` is `redis://squares:<password>@valkey-master.valkey.svc:6379/0`, the `squares` ACL user from the infra repo's `valkey-users` secret.
`SERVER_PORT` and `METRICS_*` come from the chart; other settings go in `env` in `values.yaml` (see the service's `.env.example` in the maxstash repo for each one and its default).

## Optional

- **Prometheus** - the ServiceMonitor, PrometheusRule, and Grafana dashboard ship with the chart.
