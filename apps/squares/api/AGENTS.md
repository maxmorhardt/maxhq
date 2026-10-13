# AGENTS

## Project Context

- Project: Squares API (`apps/squares/api` in `github.com/maxmorhardt/maxstash`, module `github.com/maxmorhardt/maxstash/apps/squares/api`)
- Language: Go (`go 1.26`)
- Purpose: Backend for a real-time football squares pool, split into four services built from one module:
  - **contests** - contests, squares, participants, invites, leaderboard, stats. Owns the `contests` schema plus local copies of users and games.
  - **games** - ESPN schedule and live scores. Owns the `games` schema and publishes `game.updated` events.
  - **accounts** - profiles, account deletion, the contact form. Owns the `accounts` schema and publishes `user.updated` / `user.deleted`.
  - **realtime** - server-sent events for one contest, resumable with `Last-Event-ID`. Owns no data.
- Target environments: Linux containers (`amd64`/`arm64`) on Kubernetes, one image per service (`maxmorhardt/squares-<service>`), behind the `maxstash` Envoy Gateway, which validates the Dex token and passes the claims as `X-Auth-*` headers.
- Related: `chart/` (one chart deploying all four), `../web` (the frontend), `k8s` (the Argo CD Application), `workflows` (shared CI).

## Repository Layout

- `cmd/<service>/main.go` - one entrypoint per service. Loads that service's config, connects, and runs its bootstrap.
- `internal/<service>/` - one directory per service. **Packages under one service never import another service's packages.**
  - `bootstrap/` - composition root. The only place concrete handlers, services, and repositories are constructed and wired. `Connect` opens infrastructure, `New` wires, `Start` runs background work, `Run` serves.
  - `handler/`, `service/`, `repository/`, `routes/` - the usual layers, one file per resource.
  - `migrations/` - embedded SQL applied at startup with `search_path` set to the service's schema.
  - contests also has `consumer/` (JetStream handlers for game and user events); games has `clients/` (ESPN) and `worker/` (polling); accounts and realtime have `clients/` (internal calls to contests).
- `internal/platform/` - shared infrastructure every service uses: `database` (schema-scoped connections, migrations, the `Transactor`), `messaging` (NATS, JetStream stream, transactional outbox and relay, durable consumers), `cache` (Redis: shared cache, revocation list, rate limiter, idempotency records), `middleware`, `server` (engine, health, swagger, graceful shutdown).
- `internal/events/` - the event contract between services: subjects and payloads.
- `internal/model/`, `internal/errs/`, `internal/metrics/`, `internal/util/` - shared types, sentinel errors, Prometheus collectors, helpers.
- `internal/mocks/` - mockery output for every interface in `.mockery.yaml`.
- `test/integration/` - boots all four services against real Postgres, NATS (JetStream), and Redis containers, starting from a copy of the pre-split schema.
- `docs/<service>/` - swag output per service.

## Service Boundaries

- A service writes only its own schema. Data another service owns arrives as events and is stored as a local copy (contests keeps `users`, `games`, `game_scores`).
- Every change another service cares about is written to the `outbox` table **in the same transaction** as the change, through `messaging.Outbox`. The relay publishes it to the `SQUARES` stream with the outbox id as `Nats-Msg-Id`. Never publish to NATS directly.
- Consumers must be idempotent: a message can be redelivered. They run with one message in flight, in stream order.
- Synchronous calls between services are limited to two internal reads on contests (`/internal/contests/:id/snapshot` for realtime, `/internal/users/:email/activity` for accounts), guarded by `X-Internal-Token`. Keep it that way.
- Contest rows carry `version`. Every write goes through the repository's version check; a stale write returns `errs.ErrVersionConflict`. Square edits lock the contest row `FOR SHARE` and re-check `ACTIVE` inside the transaction.

## Core Principles

1. Strict layering
   - Handler to service to repository, in one direction only.
   - Handlers parse requests, call exactly one service method, and map domain errors to status codes. They never touch the DB.
   - Repositories take and return models, take a `context.Context`, and know nothing about HTTP.
2. Interfaces at every boundary
   - Declare each interface alongside its implementation so production wiring stays obvious.
   - Constructors are `NewXxx(...)` and return the interface type.
   - Mocks are generated from those interfaces with mockery, never hand-written.
3. Explicit, typed errors
   - Services return sentinel errors from `internal/errs` so handlers can map them.
   - Services translate `gorm.ErrRecordNotFound` into a domain error; repositories pass GORM errors through unchanged.
   - Wrap with `fmt.Errorf("...: %w", err)` only when adding real context.
4. Context is a first-class parameter
   - `context.Context` is the first parameter of any function crossing a layer or touching the DB or NATS.
   - Pull loggers from context with `util.LoggerFromContext(ctx)`. Never call `slog.Default()` in a service or repository.
5. Migrations own the schema
   - Models no longer drive schema. Changing a model means adding a migration too.
   - Migrations are embedded and applied at startup under an advisory lock, so they must be safe across concurrent replicas.
6. Typed domain data
   - Never use `interface{}` or `any` for domain data. Define a struct.
7. Identity stays a plain value
   - Handlers read identity with `c.GetString(model.UserKey)` and pass it down as a `string`. Services never depend on `*gin.Context`.

## Agent Instructions

- Make the smallest safe change that solves the requested problem, and keep it inside existing package boundaries.
- **The Makefile is the canonical task runner.** Prefer `make <target>` over raw `go` or tool invocations. CI runs the same targets, so the Makefile is the single source of truth.
- One logical resource per file, lowercase names (`contest_service.go`, not `services.go`).
- After changing any interface, run `make mocks` to regenerate `internal/mocks`.
- After changing handler annotations, run `make swag` to regenerate `docs/`.
- `prealloc`, `gocritic`, and `unparam` are enabled, so give slices capacity hints and drop unused parameters.
- Avoid comments unless the code is genuinely non-obvious. Prefer expressive names.
- When adding an event, add its subject and payload to `internal/events`, write it through the outbox, and add the consumer (or the frontend handler, for contest events) in the same change.
- A new mutating route goes behind both `Auth` and `Idempotent` in that service's `routes.go`.
- The Helm chart lives in `chart/` and ships at the module's version. A change that needs a new env var, port, or route updates the chart in the same commit.

## New Endpoint Checklist

1. Add the method to the handler interface and implement it, with swag annotations (`@Summary`, `@Tags`, `@Param`, `@Success`, `@Router`, `@Security BearerAuth`).
2. Add the service method and interface entry if new business logic is needed.
3. Add the repository method and interface entry if new persistence is needed.
4. Add a migration to the owning service's `migrations/` if the schema changes.
5. Register the route in `internal/<service>/routes/routes.go`, and add its path to the service's `HTTPRoute` in `chart/values.yaml` if the gateway does not already send it there.
6. Run `make mocks`.
7. Add handler tests for success, validation error, and service error.
8. Run `make swag`.

## Testing Guidance

- One `_test.go` per source file. No `testutil` or `_internal` test files.
- White-box (`package <pkg>`) for unexported helpers; black-box (`package <pkg>_test`) when the test needs mockery mocks, since `internal/mocks` imports the real packages and would otherwise cycle.
- Use the testify expecter API: `m := mocks.NewContestService(t); m.EXPECT().CreateContest(...).Return(...)`.
- Repositories are tested with go-sqlmock (pure Go, no cgo). Set `mock.MatchExpectationsInOrder(false)`, because GORM preloads run in non-deterministic order.
- Run targeted package tests first, then `make test` for the full unit run. `make test-integration` needs a working Docker daemon (Postgres, NATS with JetStream, and Redis containers); on Windows use Docker Desktop, since testcontainers does not support rootless Docker.
- Coverage is gated at **80%** by `.testcoverage.yml` via `make cover`, measuring every service package plus `platform`, `events`, and `util`. Do not lower the threshold to get a build green.
- Always run `make test` and `make lint` before committing.

## Dependency Checklist

Before adding a new dependency, verify:

- Can this be done with the stdlib or an existing internal package?
- What is the transitive dependency and maintenance impact?
- Does it pull in cgo? Repository tests are deliberately cgo-free.
- Does it duplicate something Gin, GORM, or the NATS client already provides?
- Is the trade-off recorded in the commit rationale?

## Commit Tags

Conventional commits, enforced on PR titles and consumed by release-please. The type determines the release, so it is a functional choice, not a stylistic one.

- `feat`: New user-facing capability. Cuts a minor release.
  - Use for a new endpoint, a new event, or new behavior on an existing route.
- `fix`: Corrects wrong behavior, a regression, a crash, or a security issue. Cuts a patch release.
  - Use for failure-path and edge-case corrections. Renovate security PRs land as `fix(deps)` for this reason.
- `refactor`: Restructuring with no behavior change.
- `chore`: Maintenance that is not user-facing, including routine dependency bumps.
- `ci`: Workflow, build, or release automation changes.
- `docs`: Documentation only.
- `test`: Test-only additions or maintenance.
- `style`: Formatting only.

Scope is `squares-api` so release-please attributes the change; mention the service in the subject.

Example commit subjects:

- `feat(squares-api): add search query param to contests /contests/me`
- `fix(squares-api): exclude deleted contests from contests stats queries`
- `refactor(squares-api): collapse duplicate preload chains in contests`
- `ci: run squares-api integration tests with the race detector`

## Non-Goals for Routine Changes

- Large refactors without a clear user-facing benefit.
- Bypassing a layer, for example querying the DB from a handler.
- New dependencies when the stdlib or an existing internal package is sufficient.
- Schema changes made by editing a model without a matching migration.
- Lowering the coverage threshold or disabling a linter to get a build green.
- Editing the Argo CD Application from this repo.
