# Go libraries

Shared code for the Go services in this repo. These packages are not released on their own: they're part of the repo's single Go module, so a library change ships with the next release of each service that uses it.

| Library | Package | What it holds |
| --- | --- | --- |
| [platform](go/platform/) | `api` | request context keys, gateway claims, error and health response shapes |
| | `config` | the shared env settings and `Load[T]` for a service's config struct |
| | `database` | schema-scoped Postgres connections, embedded migrations, the `Transactor` |
| | `cache` | Valkey client and key prefix, read-through cache, revocations, idempotency records |
| | `streams` | the transactional outbox, its relay to Valkey streams, and ordered consumers that keep their position in Postgres |
| | `httpclient` | `Internal`, the client for another service's `/internal` routes: shared token, JSON decoding, retries on network errors and 5xx |
| | `middleware` | gateway identity, internal token, CORS, idempotency keys, logging, metrics, request size |
| | `server` | engine, health checks, swagger page, infrastructure wiring, graceful shutdown |
| | `logging` | the request-scoped logger carried on the context |
| | `metrics` | Prometheus collectors |
| | `testkit` | test code only: Postgres and Valkey containers, the fake gateway, an event-stream reader, and starting a service's real binary |
| [squares](go/squares/) | `events` | stream names, entry types, and payloads the squares services exchange |
| | `contracts` | the `/internal` routes contests serves to the other squares services |
| | `initials` | default initials from a display name, shared by accounts and contests |

`platform` knows nothing about any app. `squares` is the contract between the squares services and nothing else.
