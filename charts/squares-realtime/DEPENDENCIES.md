# External Dependencies

The `squares-realtime` service: one Deployment, Service, HPA, PDB, HTTPRoute, SecurityPolicy, BackendTrafficPolicy, NetworkPolicy, ServiceMonitor, PrometheusRule, and Grafana dashboard.

## Required

- **Valkey** (the `valkey` namespace) - the contest streams and the revocation list. Without Valkey no stream can open, so readiness fails.
- **squares-contests** - its `/internal` routes, at `CONTESTS_INTERNAL_URL` with `INTERNAL_API_TOKEN`.
- **Envoy Gateway** - the `maxstash` Gateway in `envoy-gateway-system` (HTTPRoute parentRef). Its `ClientTrafficPolicy` must strip client-sent `X-Auth-*` and `X-Internal-Token` headers (see `charts/maxstash-gateway`), because the service trusts them.
- **Dex** - `squares` and `squares-mobile` clients at `login.maxstash.io`. The chart's `SecurityPolicy` validates tokens against `https://login.maxstash.io/keys`.
- **NetworkPolicy enforcement** - k3s enforces NetworkPolicy with its embedded controller. The policy admits app traffic only from `envoy-gateway-system` and metrics only from `monitoring`.
- **TLS** and **DNS** - `api.maxstash.io` on the gateway, TLS terminated there.

## Routing

| Path under `api.maxstash.io/squares` | |
| --- | --- |
| `/events/contests/:id` | a server-sent event stream: a `connected` snapshot (or, with `Last-Event-ID`, only what was missed), then every change to the contest. A `revoked` event means the viewer lost access. |
| `/swagger/realtime` | the API reference |

## Secrets

`squares-realtime-env` in the `squares` namespace, read with `envFrom` (override the name with `secretName`). Sealed into
`argocd/secrets/squares/` in the infra repo; see [sealed-secrets](https://github.com/maxmorhardt/infra/blob/main/sealed-secrets/SETUP.md).

| group | keys |
| --- | --- |
| redis | `REDIS_URL` |
| service-to-service | `INTERNAL_API_TOKEN` (the same value in contests, accounts, and realtime) |
| http | `ALLOWED_ORIGINS` |

`REDIS_URL` is `redis://squares:<password>@valkey.valkey.svc:6379/0`, the `squares` ACL user from the infra repo's `valkey-users` secret.
`SERVER_PORT` and `METRICS_*` come from the chart; other settings go in `env` in `values.yaml` (see the service's `.env.example` in the maxstash repo for each one and its default).

## Optional

- **Prometheus** - the ServiceMonitor, PrometheusRule, and Grafana dashboard ship with the chart.
