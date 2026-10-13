# AGENTS

## Project Context

- Project: maxstash monorepo (`github.com/maxmorhardt/maxstash`)
- Purpose: Every public app under `maxstash.io`, plus the infra charts the cluster runs from this repo.
- Related repos: `k8s` (Argo CD Applications pinning which chart and image versions run), `workflows` (shared reusable CI).

**Each app has its own `AGENTS.md`. Read the one for the directory you are changing; it overrides this file for that directory.**

## Repository Layout

- `apps/maxstash/` - portfolio site (React Router, prerendered). Chart in `chart/`.
- `apps/squares/web/` - squares frontend (React Router SPA). Chart in `chart/`.
- `apps/squares/{contests,games,accounts,realtime}/` - the squares backend services. Each is its own Go module, image, chart, and release. `apps/squares/AGENTS.md` has the rules they share.
- `apps/squares/e2e/` - runs the four services together.
- `libs/go/` - Go libraries the services share: `platform` (infrastructure) and `squares` (the contract between the squares services). Not released on their own.
- `charts/` - infra charts that are not an app: `maxstash-gateway`, `cloudflare-ddns`, `cloudflare-cidr`.
- `.github/workflows/` - `ci.yml` (path-filtered PR checks), `release.yml` (tag-driven build, publish, deploy), `release-please.yml`, `pr-title.yml`.
- `package.json`, `.husky/` - root git hooks only. Each app under `apps/` is its own pnpm project with its own lockfile; the root is not a pnpm workspace.

## Core Principles

1. An app and its chart ship together
   - The chart lives inside the app directory and shares its version. Release-please bumps `chart/Chart.yaml` `version` and `appVersion` with the app.
   - A chart change and the code change that needs it land in the same pull request.
2. Tags drive releases
   - Tags are `<component>/<version>`. Pushing one runs `release.yml` for that component only.
   - Never hand-edit `.release-please-manifest.json`, `CHANGELOG.md`, or chart versions.
3. Apps stay independent
   - No app imports from another app's directory. Shared Go code lives in `libs/go` and is consumed through `replace` directives.
4. Git is the only source of truth for the cluster
   - Nothing here runs `helm install` or `kubectl apply`. CI commits version bumps to `k8s` and Argo CD reconciles.

## Commit Tags

Conventional commits, enforced on PR titles and consumed by release-please. **Scope is the component**, so release-please can attribute the change, though the files touched are what decide which package releases.

- Scopes: `maxstash`, `squares`, `squares-contests`, `squares-games`, `squares-accounts`, `squares-realtime`, `maxstash-gateway`, `cloudflare-ddns`, `cloudflare-cidr`, `ci`, `repo`.
- Examples: `feat(squares-realtime): resume streams with last-event-id`, `fix(squares): reconnect after token refresh`, `ci: run the squares e2e suite on library changes`.

## Non-Goals for Routine Changes

- Moving an app's chart out of its app directory.
- Importing code across app directories.
- Hand-editing versions, changelogs, or the release-please manifest.
