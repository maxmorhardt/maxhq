# AGENTS

Read [../AGENTS.md](../AGENTS.md) first: service boundaries, layering, testing, and commit rules shared by every squares service.

## Project Context

- Service: `realtime` (`apps/squares/realtime`, module `github.com/maxmorhardt/maxstash/apps/squares/realtime`). Live contest updates for browsers, over server-sent events.
- Image `maxmorhardt/squares-realtime`, release-please component `squares-realtime`. Chart: `squares-realtime` in the `charts` repo, whose `DEPENDENCIES.md` lists every secret key and setting.
- Owns no data. It needs only Valkey and the contests internal API.

## Layout

- `cmd/realtime/main.go` - loads config, connects, and runs the bootstrap.
- `internal/bootstrap/` - composition root: `Connect` opens infrastructure, `New` wires handlers, services, and repositories, `Start` runs background work, `Run` serves.
- `internal/handler/`, `internal/service/`, `internal/routes/` - the usual layers, one file per resource.
- `internal/clients/` - the contests snapshot client, a thin wrapper over `httpclient.Internal` that maps statuses to this service's errors.
- `internal/service/hub.go` - one reader per replica that fans stream entries out to open connections.
- `internal/service/stream_service.go` - resume or snapshot, then replay, then live.
- `internal/model/`, `internal/errs/`, `internal/metrics/` - this service's types and sentinel errors.
- `internal/mocks/` - mockery output for `.mockery.yaml`.
- `docs/` - swag output (`make swag`).
- `test/integration/` - the service against a real Valkey container, with contests faked.
- `test/smoke/` - builds the binary and checks it starts, migrates, and serves.

## Events

- Writes: nothing.
- Reads: `contest:<id>` for every contest with an open stream on the replica, through one blocking read (see `service/hub.go`). Before opening a stream, and whenever an event could take a viewer's access away, it asks contests over `/internal/contests/:id/snapshot`.
