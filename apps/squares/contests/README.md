# Squares Contests

![Go](https://img.shields.io/badge/go-%2300ADD8.svg?style=for-the-badge&logo=go&logoColor=white)
![Gin](https://img.shields.io/badge/gin-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Valkey](https://img.shields.io/badge/valkey-6983FF?style=for-the-badge&logo=redis&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

## Overview

Contests, squares, participants, invites, the leaderboard, and stats. One of the squares backend services; see [../README.md](../README.md) for how they fit together.

| Path (behind `api.maxhq.io/squares`) | |
| --- | --- |
| `GET /contests` | the caller's owned and joined contests, newest first, cursor paginated, filtered by `role`, `status` (`open`, `live`, `active`, `finished`), and `search` |
| `/contests/**` | create, edit, and delete contests (each linked to a live NFL game); claim, clear, and randomly fill squares |
| `/invites/**` | preview and redeem invite links |
| `/leaderboard`, `/stats` | public stats, cached in Valkey |
| `/leaderboard/me`, `/stats/me` | the signed-in user's rank and contest stats |
| `/internal/contests/:id/snapshot` | realtime only: the full contest, or 403/404 |
| `/internal/users/:email/activity` | accounts only: active contests and first activity |

## Events

- **Writes:** `contest:<id>` - every change to a contest (`square.updated`, `contest.updated`, `quarter.recorded`, `participant.joined`, `participant.updated`, `participant.removed`, `contest.deleted`), each a `{type, contestId, updatedBy, timestamp, data}` envelope from `libs/go/squares/events`.
- **Reads:** `games` (`contests-games`): keeps the local copy of each game, used only to validate new contests and to auto-start and score them; clients read games from the games service. `users` (`contests-users`): keeps display names and initials, cascades new initials onto live squares, and scrubs deleted users.

## Development

1. Copy `.env.example` to `.env` and fill it in.
2. Start PostgreSQL and Valkey with `docker compose -f ../compose.yaml up -d postgres valkey`, or the whole stack with `make up` in [..](../README.md#running-locally).
3. `make run`. `make help` lists every task.
4. Without the gateway, send the identity headers yourself:
   ```bash
   now=$(date +%s)
   curl -H "X-Auth-Email: you@example.com" -H "X-Auth-Email-Verified: true" \
     -H "X-Auth-Iat: $now" -H "X-Auth-Exp: $((now + 3600))" localhost:8080/...
   ```

API reference: `/swagger` locally, `https://api.maxhq.io/squares/swagger/contests` in production.
