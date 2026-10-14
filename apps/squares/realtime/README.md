# Squares Realtime

![Go](https://img.shields.io/badge/go-%2300ADD8.svg?style=for-the-badge&logo=go&logoColor=white)
![Gin](https://img.shields.io/badge/gin-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Valkey](https://img.shields.io/badge/valkey-6983FF?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

## Overview

Live contest updates for browsers, over server-sent events. One of the squares backend services; see [../README.md](../README.md) for how they fit together.

| Path (behind `api.maxstash.io/squares`) | |
| --- | --- |
| `/events/contests/:id` | a server-sent event stream: a `connected` snapshot (or, with `Last-Event-ID`, only what was missed), then every change to the contest. A `revoked` event means the viewer lost access. |

## Events

- **Writes:** nothing.
- **Reads:** `contest:<id>` for every contest with an open stream on the replica, through one blocking read (see `service/hub.go`). Before opening a stream, and whenever an event could take a viewer's access away, it asks contests over `/internal/contests/:id/snapshot`.

## Development

1. Copy `.env.example` to `.env` and fill it in.
2. Start Valkey and the contests service with `docker compose -f ../compose.yaml up -d valkey contests`, or the whole stack with `make up` in [..](../README.md#running-locally).
3. `make run`. `make help` lists every task.
4. Without the gateway, send the identity headers yourself:
   ```bash
   now=$(date +%s)
   curl -H "X-Auth-Email: you@example.com" -H "X-Auth-Email-Verified: true" \
     -H "X-Auth-Iat: $now" -H "X-Auth-Exp: $((now + 3600))" localhost:8080/...
   ```

API reference: `/swagger` locally, `https://api.maxstash.io/squares/swagger/realtime` in production.
