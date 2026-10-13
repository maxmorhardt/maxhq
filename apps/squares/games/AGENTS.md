# AGENTS

Read [../AGENTS.md](../AGENTS.md) first: service boundaries, layering, testing, and commit rules shared by every squares service.

## Project Context

- Service: `games` (`apps/squares/games`, module `github.com/maxmorhardt/maxstash/apps/squares/games`). The NFL schedule and live scores, polled from ESPN.
- Image `maxmorhardt/squares-games`, chart `squares-games` in `chart/`, release-please component `squares-games`.
- Owns the `games` schema. Migrations in `internal/migrations` run at startup with `search_path=games`.

## Layout

- `cmd/games/main.go` - loads config, connects, and runs the bootstrap.
- `internal/bootstrap/` - composition root: `Connect` opens infrastructure, `New` wires handlers, services, and repositories, `Start` runs background work, `Run` serves.
- `internal/handler/`, `internal/service/`, `internal/repository/`, `internal/routes/` - the usual layers, one file per resource.
- `internal/clients/` - the ESPN scoreboard client.
- `internal/worker/` - the polling loop; one replica holds a Postgres advisory lock and polls.
- `internal/util/espn.go` - turns ESPN's scoreboard into games and quarter scores.
- `internal/model/`, `internal/errs/`, `internal/metrics/` - this service's types and sentinel errors.
- `internal/mocks/` - mockery output for `.mockery.yaml`.
- `docs/` - swag output (`make swag`).
- `test/integration/` - the service against real Postgres and Valkey containers.
- `chart/` - the Helm chart; `chart/DEPENDENCIES.md` lists every secret key and setting.

## Events

- Writes: `games` - `game.updated` with the full game and every completed quarter, whenever ESPN shows a change.
- Reads: nothing
