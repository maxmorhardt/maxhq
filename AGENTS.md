# AGENTS

## Project Context

- Project: maxstash monorepo (`github.com/maxmorhardt/maxstash`)
- Purpose: Every public app under `maxstash.io`.
- Related repos: `charts` (every app's Helm chart, released on its own), `infra` (Argo CD Applications pinning which chart version and image tag run), `workflows` (shared reusable CI).

**Each app has its own `AGENTS.md`. Read the one for the directory you are changing; it overrides this file for that directory.**

## Repository Layout

- `apps/maxstash/` - portfolio site (React Router, prerendered).
- `apps/squares/web/` - squares frontend (React Router SPA).
- `apps/squares/{contests,games,accounts,realtime}/` - the squares backend services. Each is its own Go module, image, and release. `apps/squares/AGENTS.md` has the rules they share.
- `libs/` - Go libraries the services share: `platform` (infrastructure) and `squares` (the contract between the squares services). Not released on their own.
- `.github/workflows/` - `ci.yml` (path-filtered PR checks), `release.yml` (tag-driven build, publish, deploy), `release-please.yml`, `pr-title.yml`.
- `.githooks/` - the repo's one pre-commit hook: each UI's lint-staged plus gofmt. Each UI's `prepare` script enables it. Each UI is its own pnpm project with its own lockfile; there is no npm project at the root.

## Core Principles

1. Apps ship images, charts ship from the charts repo
   - A release builds the app's image and sets `image.tag` on its Argo CD Application. Charts change rarely and release on their own from `charts`.
   - A code change that needs a new env var, route, or secret key needs a matching `charts` PR, merged and released first.
2. Tags drive releases
   - Tags are `<component>/<version>`. Pushing one runs `release.yml` for that component only.
   - Never hand-edit `.release-please-manifest.json`, `CHANGELOG.md`, or chart versions.
3. Apps stay independent
   - No app imports from another app's directory. Shared Go code lives in `libs` and is consumed through `replace` directives.
4. Git is the only source of truth for the cluster
   - Nothing here runs `helm install` or `kubectl apply`. CI commits version bumps to `infra` and Argo CD reconciles.

## Commit Tags

Conventional commits, enforced on PR titles and consumed by release-please. **Scope is the component**, so release-please can attribute the change, though the files touched are what decide which package releases.

- Scopes: `maxstash`, `squares`, `squares-contests`, `squares-games`, `squares-accounts`, `squares-realtime`, `ci`, `repo`.
- Examples: `feat(squares-realtime): resume streams with last-event-id`, `fix(squares): reconnect after token refresh`, `ci: test every go service on library changes`.

## Non-Goals for Routine Changes

- Adding Helm charts here; they belong in `charts`.
- Importing code across app directories.
- Hand-editing versions, changelogs, or the release-please manifest.
