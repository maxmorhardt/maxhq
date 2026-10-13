# Squares API

![Go](https://img.shields.io/badge/go-%2300ADD8.svg?style=for-the-badge&logo=go&logoColor=white)
![Gin](https://img.shields.io/badge/gin-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Kubernetes](https://img.shields.io/badge/kubernetes-%23326ce5.svg?style=for-the-badge&logo=kubernetes&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![NATS](https://img.shields.io/badge/NATS-27AAE1?style=for-the-badge&logo=nats.io&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

## Overview
A real-time football squares pool backend built with Go and Gin, deployed as four services from one module:

| Service | Owns | Serves (behind `/squares` on the gateway) |
| --- | --- | --- |
| contests | `contests` schema | `/contests`, `/invites`, `/leaderboard`, `/stats`, `/users/me/stats`, `/users/me/active-contests` |
| games | `games` schema | `/games` |
| accounts | `accounts` schema | `/users/me`, `/contact` |
| realtime | nothing | `/events/contests/{id}` (server-sent events) |

## Features
- **Contest lifecycle** - ACTIVE → Q1 → Q2 → Q3 → Q4 → FINISHED (or DELETED), with labels randomized at kickoff and winners computed per quarter
- **Game-linked contests** - games publishes score events; contests auto-starts and scores linked contests
- **Server-sent events** - realtime streams contest events from JetStream; reconnecting with `Last-Event-ID` replays only what was missed
- **Transactional outbox** - every cross-service event is committed with the change that caused it, then relayed to JetStream
- **Optimistic locking** - contests and squares carry `version`; `PATCH /contests/{id}` honors `If-Match` and returns `ETag`
- **Idempotency keys** - any write accepts `Idempotency-Key` and replays the first response for a retry
- **Gateway authentication** - Envoy Gateway validates the Dex token; services read the claims from `X-Auth-*` headers and check the Redis revocation list for deleted accounts
- **Redis** - shared cache, revocation list, distributed rate limiting, idempotency records
- **PostgreSQL** - one schema per service, migrated at startup with golang-migrate
- **Swagger** - per service at `/squares/swagger/<service>`

## Dependencies
- **Envoy Gateway** with the squares `SecurityPolicy` (validates the Dex token, sets `X-Auth-*`)
- **PostgreSQL** (one database, one schema per service)
- **NATS** with **JetStream** enabled (stream `SQUARES`)
- **Redis**
- **SMTP** (accounts, for the contact form)

## Development
1. Copy `.env.example` to `.env` and fill in the values
2. Start PostgreSQL, NATS (`nats-server -js`), and Redis
3. Run a service with `make run SERVICE=contests` (or `games`, `accounts`, `realtime`); `make help` lists every task
4. Without the gateway, send the identity headers yourself, e.g. `curl -H "X-Auth-Email: you@example.com" -H "X-Auth-Email-Verified: true" -H "X-Auth-Iat: $(date +%s)" -H "X-Auth-Exp: $(( $(date +%s) + 3600 ))" localhost:8080/users/me/stats`
