# cloudflare-maintenance

One Cloudflare Worker that serves a single maintenance page for the whole
`maxhq.io` zone. It runs at Cloudflare's edge, so it works even when the k3s
cluster and origin are completely down. Deployed only during a planned outage. It covers prod
only: dev's records are DNS-only, so Cloudflare never sees that traffic.

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

## Preview locally

```bash
wrangler dev --local
```

Opens the page at http://127.0.0.1:8787. The page names the app it's covering (for example Squares on `squares.maxhq.io`), and it checks the origin every 30 seconds so visitors reload automatically once the Worker is deleted.

## Files

- `maintenance.html` - the page, self-contained apart from its fonts
- `worker.js` - serves the page (503) for every path, JSON for `api.*` hosts, and the fonts under `/_maintenance/`
- `fonts/` - Mona Sans and JetBrains Mono (SIL OFL 1.1, licenses alongside), bundled into the Worker so the page loads nothing from another origin
