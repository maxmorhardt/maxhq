# Adding an app

Every app ships the same way: CI on pull requests, a `sha-<commit>` image and chart in dev on merge, and a gated release to prod. A new app needs each of these, in this order.

## In this repo

1. **Code** under `apps/<app>`, with a `Dockerfile` and a `README.md` (copy a sibling's layout: `apps/squares/<service>` for a Go service, `apps/squares/web` for a UI).
2. **Chart** under `charts/<app>`. Copy the closest chart (`squares-accounts` for a service, `squares` for a UI) and rename it. Keep what every chart here has:
   - probes, resource requests and limits, and a `pdb` with at least two replicas, so node drains never take the app down;
   - a `ServiceMonitor` on the metrics port, so Grafana Alloy scrapes it;
   - an `HTTPRoute` on the `maxhq` gateway, and a `NetworkPolicy` if it is a backend.
3. **Release config:** add the app (`apps/<app>`) and the chart (`charts/<app>`, release type `helm`, component `<app>-chart`) to `release-please-config.json`, each at `1.0.0` in `.release-please-manifest.json`.
4. **CI and CD:**
   - add its paths to `.github/path-filters.yml`;
   - add its jobs to `ci.yml` (lint and test, `ci-docker`) and `cd-dev.yml` (build and deploy);
   - add its tag pattern to `cd-prod.yml`, and a smoke URL to the `case` in the parse step.
5. **DNS:** a new hostname goes into `prod_hosts` in `infra/terraform/cloudflare/domains.tf`. Dev's wildcard covers `*.dev.maxhq.io` already.
6. **Uptime:** add the public URL to `local.uptime_checks` in `infra/terraform/grafana/synthetics.tf`.

## In gitops

1. **Applications:** `clusters/dev/apps/<app>.yaml` and `clusters/prod/apps/<app>.yaml`, copied from a sibling. Point them at `ghcr.io/maxmorhardt/charts`, chart `<app>`, with an `image.tag` parameter for `cd-argocd` to bump.
2. **Namespace:** add it to `bootstrap/namespaces.sh` with the Pod Security labels.
3. **Secrets:** create each one with `scripts/secrets.sh new <cluster> <namespace>/<name> KEY=` (one per cluster). They land sealed in `clusters/<cluster>/secrets/<namespace>/`.

## First release

Merge to `main` to deploy to dev. The next release PR creates `<app>/1.0.0` and `<app>-chart/1.0.0`; approving the `production` environment ships both.
