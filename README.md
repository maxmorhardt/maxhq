# maxstash

Monorepo for everything served under `maxstash.io`.

| Path | What | Image | Chart |
| --- | --- | --- | --- |
| [`apps/maxstash`](apps/maxstash) | Portfolio site (`maxstash.io`) | `maxmorhardt/maxstash` | `apps/maxstash/chart` |
| [`apps/squares/web`](apps/squares/web) | Squares frontend (`squares.maxstash.io`) | `maxmorhardt/squares` | `apps/squares/web/chart` |
| [`apps/squares/api`](apps/squares/api) | Squares backend services: contests, games, accounts, realtime | `maxmorhardt/squares-<service>` | `apps/squares/api/chart` |
| [`charts/maxstash-gateway`](charts/maxstash-gateway) | Envoy Gateway for `maxstash.io` | - | itself |
| [`charts/cloudflare-ddns`](charts/cloudflare-ddns) | Dynamic DNS CronJob | - | itself |
| [`charts/cloudflare-cidr`](charts/cloudflare-cidr) | Cloudflare CIDR sync CronJob | - | itself |

Cluster state (which version of each chart runs) lives in [`maxmorhardt/k8s`](https://github.com/maxmorhardt/k8s). Shared CI lives in [`maxmorhardt/workflows`](https://github.com/maxmorhardt/workflows).

## Releases

[release-please](https://github.com/googleapis/release-please) manages every package in [`release-please-config.json`](release-please-config.json). Tags are `<component>/<version>`, for example `squares-api/3.0.0`. An app and its chart share one version, so a single tag builds the image, publishes the chart to `oci://ghcr.io/maxmorhardt/charts`, and bumps both `image.tag` and `targetRevision` in `k8s`.

## CI

[`ci.yml`](.github/workflows/ci.yml) runs on pull requests and only builds what changed. `CI Complete` is the single required check.

## Licenses

The repository is Apache-2.0 ([`LICENSE`](LICENSE)) except `apps/squares/**`, which is PolyForm Noncommercial 1.0.0 (see the `LICENSE` in each squares app).
