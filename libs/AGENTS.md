# AGENTS

## Rules

- **`platform` stays generic.** Nothing in it may name an app, a schema, a stream, or an event. Code that only one service needs lives in that service. The Valkey key prefix is passed in by each service (`server.InfraConfig.KeyPrefix`).
- **`squares` is a contract.** Changes must stay backwards compatible with services already running: add fields, never rename, retype, or remove them. Land the writer and every reader in the same PR.
- **No releases.** The libraries are packages in the repo's single Go module, so a change here is built into each service the next time that service releases. release-please only releases a service when a commit touches the service's own directory: a PR that changes a library's non-test code must also change every service whose binary imports that package (a test that exercises the change is the usual one). CI's `lib-consumers` job enforces it.
- **Test like a service.** Unit tests with go-sqlmock and miniredis; `make cover` holds the same 80% gate. `testkit` is excluded from coverage.
- After changing a library, run `make test` in it and in every service that imports the changed package, including their integration tests (`make test-integration`) for anything in `streams`, `cache`, `middleware`, or `squares`.

## Commits

Scope a library change to the service it is for (for example `fix(squares-contests): ...`), or to the most affected service when it spans several. CI runs every service's tests on any library change.
