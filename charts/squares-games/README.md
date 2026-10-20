# squares-games

Published to `oci://ghcr.io/maxmorhardt/charts/squares-games`, released as `squares-games-chart/<version>`; Argo CD Applications in `gitops` pin the version.

The `squares-games` service: one Deployment, Service, HPA, PDB, HTTPRoute, SecurityPolicy, BackendTrafficPolicy, NetworkPolicy, ServiceMonitor, PrometheusRule, and Grafana dashboard.

## Required

- **PostgreSQL** - 17+, primary and optional read replica. One database shared by the squares services; this service migrates only its own `games` schema at startup (and adopts the pre-split `games` and `game_scores` tables from `public` on the first start after the split).
- **Valkey** (the `valkey` namespace) - the games stream, the upcoming-games cache, and the revocation list.
- **ESPN** - `site.api.espn.com`, public and unauthenticated.
- **Envoy Gateway** - the `maxhq` Gateway in `envoy-gateway-system` (HTTPRoute parentRef). Its `ClientTrafficPolicy` must strip client-sent `X-Auth-*` and `X-Internal-Token` headers (see `charts/gateway`), because the service trusts them.
- **Dex** - `squares` and `squares-mobile` clients at `login.maxhq.io`. The chart's `SecurityPolicy` validates tokens against `https://login.maxhq.io/keys`.
- **NetworkPolicy enforcement** - k3s enforces NetworkPolicy with its embedded controller. The policy admits app traffic only from `envoy-gateway-system` and metrics only from `monitoring`.
- **TLS** and **DNS** - `api.maxhq.io` on the gateway, TLS terminated there.

## Routing

| Path under `api.maxhq.io/squares` | |
| --- | --- |
| `/games/upcoming` | the next slate of games a contest can be linked to, cached in Valkey |
| `/swagger/games` | the API reference |

## Secrets

`squares-games-env` in the `squares` namespace, read with `envFrom` (override the name with `secretName`). Sealed into
`clusters/<cluster>/secrets/squares/` in the gitops repo; see [sealed-secrets](https://github.com/maxmorhardt/gitops/blob/main/infrastructure/sealed-secrets/README.md).

| group | keys |
| --- | --- |
| database | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL_MODE` |
| read replica | the same six with a `DB_READ_` prefix (optional) |
| redis | `REDIS_URL` |
| http | `ALLOWED_ORIGINS` |

`REDIS_URL` is `redis://squares:<password>@valkey-master.valkey.svc:6379/0`, the `squares` ACL user from the gitops repo's `valkey-users` secret.
`SERVER_PORT` and `METRICS_*` come from the chart; other settings go in `env` in `values.yaml` (see the service's `.env.example` in the maxhq repo for each one and its default).

## Optional

- **Prometheus** - the ServiceMonitor, PrometheusRule, and Grafana dashboard ship with the chart.
