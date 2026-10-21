# AGENTS

Read [../AGENTS.md](../AGENTS.md) first: service boundaries, layering, testing, and commit rules shared by every squares service.

## Project Context

- Service: `games` (`apps/squares/games`, package `github.com/maxmorhardt/maxhq/apps/squares/games`). The NFL schedule and live scores, polled from ESPN.
- Image `maxmorhardt/squares-games`, release-please component `squares-games`. Chart: `charts/squares-games`, whose `README.md` lists every secret key and setting.
- Owns the `games` schema. Migrations in `internal/migrations` run at startup with `search_path=games`.

## Layout

- `cmd/games/main.go` - loads config, connects, and runs the bootstrap.
- `internal/bootstrap/` - composition root: `Connect` opens infrastructure, `New` wires handlers, services, and repositories, `Start` runs background work, `Run` serves.
- `internal/handler/`, `internal/service/`, `internal/repository/`, `internal/routes/` - the usual layers, one file per resource.
- `internal/clients/` - the ESPN scoreboard client.
- `internal/worker/` - the polling loop; one replica holds a Postgres advisory lock and polls. Every run reads ESPN's current scoreboard; at startup and every `SCORES_IDLE_INTERVAL` it also syncs every week of the season from ESPN's calendar, which backfills past scores and loads the schedule ahead. After the postseason it checks for the next season each sync and loads it once ESPN publishes it. Games whose teams are still TBD are skipped.
- Caching: `/games/scoreboard` weeks and `/games/{id}` are cached in Valkey for 5 minutes; ingest drops the entries for every game it changes, so reads see a write at once.
- `internal/util/espn.go` - turns ESPN's scoreboard into games and quarter scores.
- `internal/model/`, `internal/errs/`, `internal/metrics/` - this service's types and sentinel errors.
- `internal/mocks/` - mockery output for `.mockery.yaml`.
- `docs/` - swag output (`make swag`).
- `test/integration/` - the service against real Postgres and Valkey containers.
- `test/smoke/` - builds the binary and checks it starts, migrates, and serves.

## Events

- Writes: `games` - `game.updated` with the full game and every completed quarter, whenever ESPN shows a change.
- Reads: nothing
