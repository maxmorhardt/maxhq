# Squares end-to-end tests

Builds `contests`, `games`, `accounts`, and `realtime` from their own modules and runs the four binaries together:

- one Postgres seeded with the pre-split monolith's schema, so every service has to adopt existing data on its first start;
- one Valkey for the event streams, caches, and revocations;
- a fake ESPN scoreboard the tests rewrite as games progress.

The tests act as the gateway (they send the `X-Auth-*` headers) and as the browser (they read the event streams). They cover the legacy cutover, a game going from ESPN to a viewer's stream, resuming with `Last-Event-ID`, initials cascading from accounts to live squares, account deletion revoking tokens everywhere, and a removed participant losing the live view.

`make test` (Docker required; about two minutes). Each service's logs are written to a temp file and printed only when a test fails.
