# Squares Games

![Go](https://img.shields.io/badge/go-%2300ADD8.svg?style=for-the-badge&logo=go&logoColor=white)
![Gin](https://img.shields.io/badge/gin-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Valkey](https://img.shields.io/badge/valkey-6983FF?style=for-the-badge&logo=redis&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

## Overview

The NFL schedule and live scores, polled from ESPN. One of the squares backend services; see [../README.md](../README.md) for how they fit together.

| Path (behind `api.maxhq.io/squares`) | |
| --- | --- |
| `/games/upcoming` | the next slate of games a contest can be linked to, cached in Valkey |
| `/games/scoreboard` | one week of games with their scores by quarter (the current week unless `season`, `seasonType`, and `week` pick another); public |

## Events

- **Writes:** `games` - `game.updated` with the full game and every completed quarter, whenever ESPN shows a change.
- **Reads:** nothing

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

API reference: `/swagger` locally, `https://api.maxhq.io/squares/swagger/games` in production.
