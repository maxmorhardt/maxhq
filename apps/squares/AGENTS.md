# AGENTS

Rules shared by every squares backend service. Each service's own `AGENTS.md` covers its layout and anything specific to it; read both.

## Project Context

- Product: a real-time football squares pool at `squares.maxstash.io`.
- Applications under `apps/squares/`:
  - `web/` - the React frontend.
  - `contests/` - contests, squares, participants, invites, leaderboard, stats. Owns the `contests` schema plus local copies of users and games.
  - `games/` - ESPN schedule and live scores. Owns the `games` schema.
  - `accounts/` - profiles, account deletion, the contact form. Owns the `accounts` schema.
  - `realtime/` - server-sent events for one contest, resumable with `Last-Event-ID`. Owns no data.
  - `e2e/` - black-box tests that build and run all four services together.
- Each service is its own Go module, image (`maxmorhardt/squares-<service>`), Helm chart (`<service>/chart`, released as `squares-<service>`), Argo CD Application, and release-please component. A service never imports another service's packages; Go's `internal` rule enforces it.
- Shared code lives in two library modules, consumed through `replace` directives:
  - `libs/go/platform` - infrastructure every Go service uses: config, database, Redis (cache, revocations, rate limits, idempotency), streams (outbox, relay, consumers), middleware, server, metrics.
  - `libs/go/squares` - the contract between squares services: stream names, event types and payloads (`events`), and the `/internal` API (`internalapi`).
- Everything sits behind the `maxstash` Envoy Gateway at `api.maxstash.io/squares`. The gateway validates the Dex token and passes its claims as `X-Auth-*` headers.

## Service Boundaries

- A service writes only its own schema. Data another service owns arrives as events and is kept as a local copy (contests keeps `users`, `games`, `game_scores`).
- Every change another service cares about is written to the service's `outbox` table **in the same transaction** as the change, through `streams.Outbox`. The relay appends it to a Redis stream, deduplicated by outbox id. Never write to a stream directly.
- Streams and their writers:
  - `contest:<id>` - contests. Read by realtime.
  - `games` - games. Read by contests.
  - `users` - accounts. Read by contests.
- Consumers keep their position in their own schema (`stream_offsets`), handle entries in order, and retry a failing entry with backoff before moving on. A handler must tolerate seeing an entry again after a crash. A payload that can never decode is logged and skipped.
- Synchronous calls between services are limited to two internal reads on contests (`/internal/contests/:id/snapshot` for realtime, `/internal/users/:email/activity` for accounts), guarded by `X-Internal-Token` and a NetworkPolicy. Keep it that way.
- Changing a payload in `libs/go/squares` is a contract change: keep it backwards compatible (add fields, never rename or retype), and land the writer and every reader in the same PR.

## Core Principles

1. Strict layering
   - Handler to service to repository, in one direction only.
   - Handlers parse requests, call exactly one service method, and map domain errors to status codes. They never touch the DB.
   - Repositories take and return models, take a `context.Context`, and know nothing about HTTP.
2. Interfaces at every boundary
   - Declare each interface alongside its implementation. Constructors are `NewXxx(...)` and return the interface.
   - Mocks are generated with mockery (`make mocks`), never hand-written.
3. Explicit, typed errors
   - Services return sentinel errors from the service's `internal/errs` so handlers can map them.
   - Services translate `gorm.ErrRecordNotFound` into a domain error; repositories pass GORM errors through unchanged.
4. Context is a first-class parameter
   - `context.Context` comes first in any function crossing a layer or touching Postgres or Redis.
   - Pull loggers from context with `reqctx.LoggerFromContext(ctx)`. Never call `slog.Default()` in a service or repository.
5. Migrations own the schema
   - Changing a model means adding a migration in the owning service's `internal/migrations`.
   - Migrations are embedded and applied at startup with `search_path` set to the service's schema.
6. Identity stays a plain value
   - Handlers read identity with `c.GetString(api.UserKey)` and pass it down as a `string`. Services never depend on `*gin.Context`.
7. Redis outages degrade, they do not fail requests
   - Caches, rate limits, idempotency, and revocation checks fail open. Events cannot: they wait in the outbox until Redis is back.

## Agent Instructions

- Make the smallest safe change that solves the requested problem.
- **Each module's Makefile is its task runner.** Run `make <target>` from that module's directory. CI runs the same targets.
- One logical resource per file, lowercase names (`contest_service.go`, not `services.go`).
- After changing an interface, run `make mocks`. After changing handler annotations, run `make swag`.
- `prealloc`, `gocritic`, and `unparam` are enabled, so give slices capacity hints and drop unused parameters.
- Avoid comments unless the code is genuinely non-obvious.
- A new mutating route goes behind both `Auth` and `Idempotent` in that service's `routes.go`.
- The chart lives in the service's `chart/` and ships at the service's version. A change that needs a new env var, port, route, or secret key updates the chart and its `DEPENDENCIES.md` in the same commit.
- A change to `libs/go/*` triggers CI for every service. Run the affected services' tests before committing.

## Testing Guidance

- Unit tests: one `_test.go` per source file. Black-box (`package <pkg>_test`) when the test needs mockery mocks.
- Repositories are tested with go-sqlmock. Set `mock.MatchExpectationsInOrder(false)`, since GORM preloads run in non-deterministic order.
- `make test-integration` runs the service against real Postgres and Valkey containers (Docker required; on Windows use Docker Desktop). Other services are replaced by small fakes or by appending their events to Redis directly.
- `apps/squares/e2e` runs the four real binaries together against a database seeded with the pre-split schema. Run it after any change that crosses a service boundary.
- Coverage is gated at **80%** per service by `.testcoverage.yml`. Do not lower the threshold to get a build green.

## Commit Tags

Conventional commits, enforced on PR titles and consumed by release-please. The scope picks which component releases:

- `squares-contests`, `squares-games`, `squares-accounts`, `squares-realtime` - one service.
- `squares` - the web app.
- A change to `libs/go/*` alone releases nothing: it ships with each service's next release. To ship it now, change each service that needs it in the same PR (see `libs/go/AGENTS.md`).

Examples:

- `feat(squares-contests): add search query param to /contests/me`
- `fix(squares-realtime): close streams for viewers removed from a private contest`
- `refactor(squares-games): collapse duplicate espn parsing`

## Non-Goals for Routine Changes

- Importing one service's code from another, or moving service logic into `libs/go/platform`.
- Writing to another service's schema or calling another service outside the two internal reads.
- Lowering the coverage threshold or disabling a linter to get a build green.
- Editing the Argo CD Applications from this repo.
