# maxstash

Monorepo for everything served under `maxstash.io`.

| Path | What | Image | Chart |
| --- | --- | --- | --- |
| [`apps/maxstash`](apps/maxstash) | Portfolio site (`maxstash.io`) | `maxmorhardt/maxstash` | `apps/maxstash/chart` |
| [`apps/squares/web`](apps/squares/web) | Squares frontend (`squares.maxstash.io`) | `maxmorhardt/squares` | `apps/squares/web/chart` |
| [`apps/squares/contests`](apps/squares/contests) | Squares contests service | `maxmorhardt/squares-contests` | `apps/squares/contests/chart` |
| [`apps/squares/games`](apps/squares/games) | Squares schedule and live scores | `maxmorhardt/squares-games` | `apps/squares/games/chart` |
| [`apps/squares/accounts`](apps/squares/accounts) | Squares profiles and contact form | `maxmorhardt/squares-accounts` | `apps/squares/accounts/chart` |
| [`apps/squares/realtime`](apps/squares/realtime) | Squares live updates (server-sent events) | `maxmorhardt/squares-realtime` | `apps/squares/realtime/chart` |
| [`apps/squares/e2e`](apps/squares/e2e) | End-to-end tests for the four squares services | - | - |
| [`libs/go`](libs/go) | Go libraries shared by the services (`platform`, `squares`) | - | - |
| [`charts/maxstash-gateway`](charts/maxstash-gateway) | Envoy Gateway for `maxstash.io` | - | itself |
| [`charts/cloudflare-ddns`](charts/cloudflare-ddns) | Dynamic DNS CronJob | - | itself |
| [`charts/cloudflare-cidr`](charts/cloudflare-cidr) | Cloudflare CIDR sync CronJob | - | itself |

Cluster state (which version of each chart runs) lives in [`maxmorhardt/k8s`](https://github.com/maxmorhardt/k8s). Shared CI lives in [`maxmorhardt/workflows`](https://github.com/maxmorhardt/workflows).

## Releases

[release-please](https://github.com/googleapis/release-please) manages every package in [`release-please-config.json`](release-please-config.json). Tags are `<component>/<version>`, for example `squares-contests/1.2.0`. An app and its chart share one version, so a single tag builds the image, publishes the chart to `oci://ghcr.io/maxmorhardt/charts`, and bumps both `image.tag` and `targetRevision` in `k8s`.

## CI

[`ci.yml`](.github/workflows/ci.yml) runs on pull requests and only builds what changed; a change under `libs/go` tests every Go service and the squares e2e suite. `CI Complete` is the single required check.

The Go modules are tied together by `replace` directives, so each builds on its own. [`go.work`](go.work) only lets editors see all of them at once.

## Licenses

The repository is Apache-2.0 ([`LICENSE`](LICENSE)) except `apps/squares/**`, which is PolyForm Noncommercial 1.0.0 (see the `LICENSE` in each squares app).
