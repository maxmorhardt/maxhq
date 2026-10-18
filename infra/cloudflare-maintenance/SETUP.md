## Overview

One Cloudflare Worker that serves a single maintenance page for the whole
`maxstash.io` zone. It runs at Cloudflare's edge, so it works even when the k3s
cluster and origin are completely down. Deployed only during a planned outage.

## Setup (one time)

```bash
npm install -g wrangler
wrangler login
```

## Turn maintenance ON (before taking the cluster down)

```bash
wrangler deploy
```

## Turn maintenance OFF (once the cluster is back)

```bash
wrangler delete
```
