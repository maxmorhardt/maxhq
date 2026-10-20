# AGENTS

## Project Context

- Project: maxhq monorepo (`github.com/maxmorhardt/maxhq`)
- Purpose: Every public app under `maxhq.io`, the Helm chart for each, and the tooling for what runs outside the cluster.
- Related repos: `gitops` (Argo CD Applications and component values: what runs where, at which image tag), `workflows` (shared reusable CI).

**Each app has its own `AGENTS.md`. Read the one for the directory you are changing; it overrides this file for that directory.**

## Repository Layout

- `apps/maxhq/` - portfolio site (React Router, prerendered).
- `apps/squares/web/` - squares frontend (React Router SPA).
- `apps/squares/{contests,games,accounts,realtime}/` - the squares backend services. Each has its own image, chart, and release. `apps/squares/AGENTS.md` has the rules they share.
- `libs/` - Go libraries the services share: `platform` (infrastructure) and `squares` (the contract between the squares services). Not released on their own.
- `charts/<name>/` - one self-contained Helm chart per app, plus `gateway` (Gateway API infrastructure, not an app) and `cloudflare-cidr`, a CronJob that posts to Discord when Cloudflare's IP ranges drift from the gateway's `trustedCIDRs`. Each chart is its own release (`<chart>-chart`), published to `oci://ghcr.io/maxmorhardt/charts`.
- `infra/terraform/` - the resources Argo CD cannot reach: the S3 backup bucket and its IAM identity, Cloudflare DNS for every domain, and GitHub rulesets and deployment environments. See `infra/terraform/README.md`.
- `infra/k3s/` - node bootstrap over SSH (`bootstrap/main.py`) and the k3s runbook.
- `infra/cloudflare-maintenance/` - Cloudflare Worker serving a maintenance page during planned outages. Deployed with wrangler.
- `.github/workflows/` - `ci.yml` (path-filtered PR checks), `cd-dev.yml` (merge-driven build and deploy to dev; run it by hand to redeploy every app), `cd-prod.yml` (tag-driven promotion of dev's image and deploy to prod), `cd-terraform.yml` (applies `infra/terraform/` on merge, plans it weekly for drift), `release-please.yml`, `pr-title.yml`. `ci.yml` and `cd-dev.yml` share their path filters from `.github/path-filters.yml`.
- `.githooks/` - the repo's one pre-commit hook: each UI's lint-staged plus gofmt. Each UI's `prepare` script enables it. Each UI is its own pnpm project with its own lockfile; there is no npm project at the root.

## Core Principles

1. Merges deploy to dev; releases deploy to prod
   - Images and charts version and deploy separately. A merge to `main` builds `sha-<commit>` images for the apps it touched and sets dev's `image.tag`, and publishes any changed chart as `0.0.0-sha-<commit>` to `oci://ghcr.io/maxmorhardt/charts` and sets dev's `targetRevision` (`cd-dev.yml`).
   - An app release (`<app>/<version>`) promotes the image dev built for that commit (`sha-<commit>` retagged, never rebuilt) and sets prod's `image.tag`. A chart release (`<chart>-chart/<version>`, release-please `helm` type bumping `Chart.yaml`) publishes the chart and sets prod's `targetRevision`. Both wait for approval on the `production` environment (`cd-prod.yml`).
2. Tags drive releases
   - Tags are `<component>/<version>`. Pushing one runs `cd-prod.yml` for that component only.
   - Never hand-edit `.release-please-manifest.json`, `CHANGELOG.md`, or a chart's `version`.
3. Apps stay independent
   - No app imports from another app's directory. All Go code is one module (`github.com/maxmorhardt/maxhq`, root `go.mod`); shared code lives in `libs`.
4. Git is the only source of truth for the cluster
   - Nothing here runs `helm install` or `kubectl apply`. CI commits version bumps to `gitops` and Argo CD reconciles.
5. Terraform is applied, not reconciled
   - A merge applies `infra/terraform/`, but nothing watches it afterwards. Drift stays invisible until the Monday scheduled plan.
   - Never resolve a plan diff by changing live infrastructure. Match the HCL to what exists, then change it deliberately in its own commit. `aws_s3_bucket.backups` carries `prevent_destroy`.

## Charts

- Production posture is not opt-in: non-root `securityContext` with `readOnlyRootFilesystem`, `emptyDir` for every writable path, startup, readiness, and liveness probes, requests equal to limits, pod anti-affinity, an HPA, and a PDB. Start a new chart from an existing one so none of this is dropped.
- `image.tag` is `''` in `values.yaml`. The real tag comes from the Argo CD Application in `gitops`.
- Every chart defines the same `_helpers.tpl` set (`app.name`, `app.fullname`, `app.chart`, `app.labels`, `app.selectorLabels`). Dashboards and alert expressions match on `app.fullname`, so renaming a helper breaks alerting silently. Copy it verbatim into a new chart.
- Set `fullnameOverride` so resource names do not depend on the release name.
- Routing is `HTTPRoute` with a `parentRef` to the `maxhq` gateway in `envoy-gateway-system`; rate limiting goes in the `BackendTrafficPolicy`.
- Alert rules live in `values.yaml` under `metrics.prometheusRule.rules`, labelled `severity` (`warning` or `critical`), `component`, and `layer` (`frontend` or `backend`).
- Gate optional resources behind an `enabled` flag, and update the chart's `README.md` when a template starts depending on something outside the chart.
- Rendering is the test. CI runs `helm lint --strict`, `helm template`, and kubeconform on every changed chart:

  ```bash
  helm lint charts/squares --strict --set image.tag=0.0.0-validate
  helm template validate charts/squares --set image.tag=0.0.0-validate
  ```

  Invalid Kubernetes YAML fails kubeconform, not lint, so render with optional flags both on and off.

## Commit Tags

Conventional commits, enforced on PR titles and consumed by release-please. **Scope is the component**, so release-please can attribute the change, though the files touched are what decide which package releases.

- Scopes: `maxhq`, `squares`, `squares-contests`, `squares-games`, `squares-accounts`, `squares-realtime`, a chart name for chart-only changes, `terraform`, `k3s`, `cloudflare-maintenance`, `ci`, `repo`.
- Examples: `feat(squares-realtime): resume streams with last-event-id`, `fix(squares): reconnect after token refresh`, `chore(terraform): import the bucket policy`, `ci: test every go service on library changes`.

## Non-Goals for Routine Changes

- Importing code across app directories.
- Hand-editing versions, changelogs, or the release-please manifest.
- Pinning `image.tag` in a chart's `values.yaml`.
- Dropping probes, security context, PDB, or anti-affinity from an application chart to simplify it.
- Managing cluster resources with Terraform, or out-of-cluster resources with Argo CD.
