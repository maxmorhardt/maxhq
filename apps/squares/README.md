# Squares

A real-time football squares pool at [squares.maxhq.io](https://squares.maxhq.io): a React app and four Go services, each built, versioned, and deployed on its own.

| App | What it does | Owns | Talks to |
| --- | --- | --- | --- |
| [web](web/) | The site | - | every service, through `api.maxhq.io/squares` |
| [contests](contests/) | Contests, squares, participants, invites, leaderboard, stats | `contests` schema | reads the `games` and `users` streams; writes one stream per contest |
| [games](games/) | NFL schedule and live scores from ESPN | `games` schema | writes the `games` stream |
| [accounts](accounts/) | Profiles, account deletion, contact form | `accounts` schema | writes the `users` stream; asks contests for a user's activity |
| [realtime](realtime/) | Live updates over server-sent events | nothing | reads the contest streams; asks contests who may watch |

## How a change reaches a viewer

```
browser ──PATCH──▶ gateway ──▶ contests ──┬─ UPDATE squares        ┐ one postgres
                   (validates             └─ INSERT outbox          ┘ transaction
                    the token)                   │
                                           relay │ XADD (deduplicated by outbox id)
                                                 ▼
                                      valkey stream contest:<id>
                                                 │ one blocking read per realtime replica
                                                 ▼
browser ◀──── server-sent event ───── realtime ──┘   (id = stream entry id, so a
                                                       reconnect resumes with Last-Event-ID)
```

Games and accounts publish the same way, to the `games` and `users` streams, and contests consumes them in order. It keeps its position in Postgres, so a restart picks up where it left off.

## Shared code

- [`libs/platform`](../../libs/platform) - config, Postgres, Valkey, outbox and streams, middleware, server.
- [`libs/squares`](../../libs/squares) - the contract between the services: stream names, event payloads, the `/internal` API, and shared helpers like initials.

## Running locally

Requires Docker and pnpm.

```bash
make up    # Postgres, Valkey, the four services, and a gateway on localhost:8080
make web   # the site on localhost:3000, signing in through Dex like production
```

The gateway ([envoy.yaml](envoy.yaml)) does what production's does: it validates Dex tokens, copies their claims into `X-Auth-*` headers, and routes `/squares/*` to each service. Swagger is at `localhost:8080/squares/swagger/<service>`. `make logs S=contests`, `make down`, and `make reset` (which also wipes the data) cover the rest. Contact-form emails are logged instead of sent.

Rules for working across the services are in [AGENTS.md](AGENTS.md).
