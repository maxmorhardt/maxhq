# Squares Contests

![Go](https://img.shields.io/badge/go-%2300ADD8.svg?style=for-the-badge&logo=go&logoColor=white)
![Gin](https://img.shields.io/badge/gin-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Redis](https://img.shields.io/badge/valkey-6983FF?style=for-the-badge&logo=redis&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

## Overview

Contests, squares, participants, invites, the leaderboard, and stats. One of the squares backend services; see [../README.md](../README.md) for how they fit together.

| Path (behind `api.maxstash.io/squares`) | |
| --- | --- |
| `/contests/**` | create, edit, start, score, and delete contests; claim and clear squares |
| `/invites/**` | preview and redeem invite links |
| `/leaderboard`, `/stats` | public stats, cached in Redis |
| `/users/me/stats`, `/users/me/active-contests` | the signed-in user's contest activity |
| `/internal/contests/:id/snapshot` | realtime only: the full contest, or 403/404 |
| `/internal/users/:email/activity` | accounts only: active contests and first activity |

## Events

- **Writes:** `contest:<id>` - every change to a contest (`square_update`, `contest_update`, `quarter_result_update`, `quarter_result_rollback`, `participant_added`, `participant_removed`, `contest_deleted`).
- **Reads:** `games` (`contests-games`): keeps the local copy of each game and auto-starts and scores linked contests. `users` (`contests-users`): keeps display names and initials, cascades new initials onto live squares, and scrubs deleted users.

## Development

1. Copy `.env.example` to `.env` and fill it in.
2. Start PostgreSQL and Redis (or `make redis` to port-forward the cluster's).
3. `make run`. `make help` lists every task.
4. Without the gateway, send the identity headers yourself:
   ```bash
   now=$(date +%s)
   curl -H "X-Auth-Email: you@example.com" -H "X-Auth-Email-Verified: true" \
     -H "X-Auth-Iat: $now" -H "X-Auth-Exp: $((now + 3600))" localhost:8080/...
   ```

API reference: `/swagger` locally, `https://api.maxstash.io/squares/swagger/contests` in production.
