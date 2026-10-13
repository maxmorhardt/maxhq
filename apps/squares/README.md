# Squares

A real-time football squares pool at [squares.maxstash.io](https://squares.maxstash.io): a React app and four Go services, each built, versioned, and deployed on its own.

| App | What it does | Owns | Talks to |
| --- | --- | --- | --- |
| [web](web/) | The site | - | every service, through `api.maxstash.io/squares` |
| [contests](contests/) | Contests, squares, participants, invites, leaderboard, stats | `contests` schema | reads the `games` and `users` streams; writes one stream per contest |
| [games](games/) | NFL schedule and live scores from ESPN | `games` schema | writes the `games` stream |
| [accounts](accounts/) | Profiles, account deletion, contact form | `accounts` schema | writes the `users` stream; asks contests for a user's activity |
| [realtime](realtime/) | Live updates over server-sent events | nothing | reads the contest streams; asks contests who may watch |

[e2e](e2e/) builds all four services and runs them together against Postgres and Valkey.

## How a change reaches a viewer

```
browser ──PATCH──▶ gateway ──▶ contests ──┬─ UPDATE squares        ┐ one postgres
                   (validates             └─ INSERT outbox          ┘ transaction
                    the token)                   │
                                           relay │ XADD (deduplicated by outbox id)
                                                 ▼
                                       redis stream contest:<id>
                                                 │ one blocking read per realtime replica
                                                 ▼
browser ◀──── server-sent event ───── realtime ──┘   (id = stream entry id, so a
                                                       reconnect resumes with Last-Event-ID)
```

Games and accounts publish the same way, to the `games` and `users` streams, and contests consumes them in order. It keeps its position in Postgres, so a restart picks up where it left off.

## Shared code

- [`libs/go/platform`](../../libs/go/platform) - config, Postgres, Redis, outbox and streams, middleware, server.
- [`libs/go/squares`](../../libs/go/squares) - the contract between the services: stream names, event payloads, and the `/internal` API.

Rules for working across the services are in [AGENTS.md](AGENTS.md).
