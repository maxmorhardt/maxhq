# AGENTS

Read [../AGENTS.md](../AGENTS.md) first: service boundaries, layering, testing, and commit rules shared by every squares service.

## Project Context

- Service: `accounts` (`apps/squares/accounts`, module `github.com/maxmorhardt/maxhq/apps/squares/accounts`). Profiles, account deletion, and the contact form.
- Image `maxmorhardt/squares-accounts`, release-please component `squares-accounts`. Chart: `squares-accounts` in the `charts` repo, whose `DEPENDENCIES.md` lists every secret key and setting.
- Owns the `accounts` schema. Migrations in `internal/migrations` run at startup with `search_path=accounts`.

## Layout

- `cmd/accounts/main.go` - loads config, connects, and runs the bootstrap.
- `internal/bootstrap/` - composition root: `Connect` opens infrastructure, `New` wires handlers, services, and repositories, `Start` runs background work, `Run` serves.
- `internal/handler/`, `internal/service/`, `internal/repository/`, `internal/routes/` - the usual layers, one file per resource.
- `internal/clients/` - the contests activity client, a thin wrapper over `httpclient.Internal` that maps statuses to this service's errors.
- `internal/templates/` - the contact email template.
- `internal/model/`, `internal/errs/` - this service's types and sentinel errors.
- `internal/mocks/` - mockery output for `.mockery.yaml`.
- `docs/` - swag output (`make swag`).
- `test/integration/` - the service against real Postgres and Valkey containers.
- `test/smoke/` - builds the binary and checks it starts, migrates, and serves.

## Events

- Writes: `users` - `user.updated` when a profile is created or changes, `user.deleted` when an account is deleted.
- Reads: nothing. Before creating or deleting a profile it asks contests for the user's activity over `/internal/users/:email/activity`.
