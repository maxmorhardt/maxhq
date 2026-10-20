# AGENTS

Read [../AGENTS.md](../AGENTS.md) first: service boundaries, layering, testing, and commit rules shared by every squares service.

## Project Context

- Service: `contests` (`apps/squares/contests`, module `github.com/maxmorhardt/maxhq/apps/squares/contests`). Contests, squares, participants, invites, the leaderboard, and stats.
- Image `maxmorhardt/squares-contests`, release-please component `squares-contests`. Chart: `charts/squares-contests`, whose `README.md` lists every secret key and setting.
- Owns the `contests` schema. Migrations in `internal/migrations` run at startup with `search_path=contests`.

## Layout

- `cmd/contests/main.go` - loads config, connects, and runs the bootstrap.
- `internal/bootstrap/` - composition root: `Connect` opens infrastructure, `New` wires handlers, services, and repositories, `Start` runs background work, `Run` serves.
- `internal/handler/`, `internal/service/`, `internal/repository/`, `internal/routes/` - the usual layers, one file per resource.
- `internal/consumer/` - the stream handlers for game and user events.
- `internal/handler/validators.go` - the `contestname` binding tag.
- `internal/model/`, `internal/errs/`, `internal/metrics/` - this service's types and sentinel errors.
- `internal/mocks/` - mockery output for `.mockery.yaml`.
- `docs/` - swag output (`make swag`).
- `test/integration/` - the service against real Postgres and Valkey containers.
- `test/smoke/` - builds the binary and checks it starts, migrates, and serves.

## Events

- Writes: `contest:<id>` - every change to a contest (`square_update`, `contest_update`, `quarter_result_update`, `quarter_result_rollback`, `participant_added`, `participant_removed`, `contest_deleted`).
- Reads: `games` (`contests-games`): keeps the local copy of each game and auto-starts and scores linked contests. `users` (`contests-users`): keeps display names and initials, cascades new initials onto live squares, and scrubs deleted users.
