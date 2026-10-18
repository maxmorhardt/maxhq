# maxhq

Monorepo for everything served under `maxstash.io`: the apps, their Helm charts, and the tooling for what runs outside the cluster.

| Path | What | Image |
| --- | --- | --- |
| [`apps/maxstash`](apps/maxstash) | Portfolio site (`maxstash.io`) | `maxmorhardt/maxstash` |
| [`apps/squares/web`](apps/squares/web) | Squares frontend (`squares.maxstash.io`) | `maxmorhardt/squares` |
| [`apps/squares/contests`](apps/squares/contests) | Squares contests service | `maxmorhardt/squares-contests` |
| [`apps/squares/games`](apps/squares/games) | Squares schedule and live scores | `maxmorhardt/squares-games` |
| [`apps/squares/accounts`](apps/squares/accounts) | Squares profiles and contact form | `maxmorhardt/squares-accounts` |
| [`apps/squares/realtime`](apps/squares/realtime) | Squares live updates (server-sent events) | `maxmorhardt/squares-realtime` |
| [`libs`](libs) | Go libraries shared by the services (`platform`, `squares`) | - |
| [`charts`](charts) | Helm chart for each app, the gateway, and the Cloudflare CronJobs | - |
| [`infra/terraform`](infra/terraform/SETUP.md) | AWS backups, Cloudflare DNS, GitHub rulesets | - |
| [`infra/k3s`](infra/k3s/SETUP.md) | Node bootstrap and the k3s runbook | - |
| [`infra/cloudflare-maintenance`](infra/cloudflare-maintenance/SETUP.md) | Maintenance page Worker | - |

Cluster state (which image tag each app runs, plus every infra component's values) lives in [`maxmorhardt/gitops`](https://github.com/maxmorhardt/gitops). Shared CI lives in [`maxmorhardt/workflows`](https://github.com/maxmorhardt/workflows).

## Releases

[release-please](https://github.com/googleapis/release-please) manages every app in [`release-please-config.json`](release-please-config.json). Tags are `<component>/<version>`, for example `squares-contests/1.2.0`. A tag builds and pushes the app's image and commits the new `image.tag` to its Argo CD Application in `gitops`.

One release pull request covers every app with pending changes. Pull requests are squash merged, so the PR title is the conventional commit release-please reads, and it applies to every app the PR touches.

## Running squares locally

`make up` and `make web` in [`apps/squares`](apps/squares/README.md#running-locally) run every service, Postgres, Valkey, and a production-like gateway in Docker.

## CI

[`ci.yml`](.github/workflows/ci.yml) runs on pull requests and only builds what changed; a change under `libs` tests every Go service, a changed chart is linted and rendered, and a change under `infra/terraform` plans every module. `CI Complete` is the single required check. [`cd-terraform.yml`](.github/workflows/cd-terraform.yml) applies Terraform on merge.

The Go modules are tied together by `replace` directives, so each builds on its own. [`go.work`](go.work) only lets editors see all of them at once.

## Git hooks

[`.githooks/pre-commit`](.githooks/pre-commit) runs each UI's own lint-staged when its files are staged, and gofmt on staged Go files. `pnpm install` in either UI turns it on (`git config core.hooksPath .githooks`); there is no npm project at the root.

## Licenses

| Path | License |
| --- | --- |
| everything not listed below (`apps/maxstash`, `charts`, `infra`, CI, repo config) | Apache-2.0 ([`LICENSE`](LICENSE)) |
| `apps/squares/**` | PolyForm Noncommercial 1.0.0 (the `LICENSE` in each squares app) |
| `libs/**` | PolyForm Noncommercial 1.0.0 ([`libs/platform/LICENSE`](libs/platform/LICENSE), [`libs/squares/LICENSE`](libs/squares/LICENSE)); both were extracted from the squares API |

A directory's own `LICENSE` overrides the root one for everything under it.
