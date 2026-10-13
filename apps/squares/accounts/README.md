# Squares Accounts

![Go](https://img.shields.io/badge/go-%2300ADD8.svg?style=for-the-badge&logo=go&logoColor=white)
![Gin](https://img.shields.io/badge/gin-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Redis](https://img.shields.io/badge/valkey-6983FF?style=for-the-badge&logo=redis&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

## Overview

Profiles, account deletion, and the contact form. One of the squares backend services; see [../README.md](../README.md) for how they fit together.

| Path (behind `api.maxstash.io/squares`) | |
| --- | --- |
| `/users/me` | get (creating the profile on first sign-in), update initials, delete the account |
| `/contact` | the public contact form, behind Turnstile and a rate limit shared by every replica |

## Events

- **Writes:** `users` - `user.updated` when a profile is created or changes, `user.deleted` when an account is deleted.
- **Reads:** nothing. Before creating or deleting a profile it asks contests for the user's activity over `/internal/users/:email/activity`.

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

API reference: `/swagger` locally, `https://api.maxstash.io/squares/swagger/accounts` in production.
