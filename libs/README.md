# Go libraries

Shared code for the Go services in this repo. These modules are not released on their own: services consume them through `replace` directives, so a library change ships with the next release of each service that uses it.

| Module | Package | What it holds |
| --- | --- | --- |
| [platform](platform/) | `api` | request context keys, gateway claims, error and health response shapes |
| | `config` | the shared env settings and `Load[T]` for a service's config struct |
| | `database` | schema-scoped Postgres connections, embedded migrations, the `Transactor` |
| | `cache` | Redis client and key prefix, read-through cache, revocations, rate limits, idempotency records |
| | `streams` | the transactional outbox, its relay to Redis streams, and ordered consumers that keep their position in Postgres |
| | `middleware` | gateway identity, internal token, CORS, idempotency keys, rate limits, logging, metrics, request size |
| | `server` | engine, health checks, swagger page, infrastructure wiring, graceful shutdown |
| | `metrics`, `reqctx`, `strutil` | Prometheus collectors, context helpers, string helpers |
| | `testkit` | test code only: Postgres and Valkey containers, the fake gateway, an event-stream reader, and starting a service's real binary |
| [squares](squares/) | `events` | stream names, entry types, and payloads the squares services exchange |
| | `internalapi` | the `/internal` routes contests serves to the other squares services |

`platform` knows nothing about any app. `squares` is the contract between the squares services and nothing else.
