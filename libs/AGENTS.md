# AGENTS

## Rules

- **`platform` stays generic.** Nothing in it may name an app, a schema, a stream, or an event. Code that only one service needs lives in that service. The Valkey key prefix is passed in by each service (`server.InfraConfig.KeyPrefix`).
- **`squares` is a contract.** Changes must stay backwards compatible with services already running: add fields, never rename or retype them. Services move to a new version one at a time, so a running service must keep working against both the old and the new shape. To retire a name, add its replacement first, move every service and the web app onto it, and remove the old one only once no code uses it and nothing can still read events sent under it, such as a stream consumer behind its offset within `STREAM_RETENTION`.
- **Released on their own.** `libs/go` is one module that release-please tags as `libs/go/v<version>`. Each service requires a released version, and Renovate bumps it in every service once a release is tagged. Tags can't be moved or deleted (a GitHub ruleset) and the Go module proxy caches every version forever, so a bad release is fixed with a new one. A breaking `!` commit would tag `v2`, which Go only accepts under a `/v2` module path, so keep changes backwards compatible instead.
- **No `replace` in a service's `go.mod`.** Try an unreleased change through a local `go.work` (gitignored), never a committed `replace`.
- **Test like a service.** Unit tests with go-sqlmock and miniredis; `make cover` holds the same 80% gate. `testkit` is excluded from coverage.
- After changing a library, run `make test` in it, then run every service that imports the changed package against it through a local `go.work`, including their integration tests (`make test-integration`) for anything in `streams`, `cache`, `middleware`, or `squares`.

## Commits

Scope a library change `libs` (for example `fix(libs): retry relay reads after a timeout`). A `feat` or `fix` releases `libs/go`; CI runs only the libraries' tests, and each service's CI runs when Renovate's bump reaches it.
