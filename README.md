# maxstash

Monorepo for everything served under `maxstash.io`.

| Path | What | Image |
| --- | --- | --- |
| [`apps/maxstash`](apps/maxstash) | Portfolio site (`maxstash.io`) | `maxmorhardt/maxstash` |
| [`apps/squares/web`](apps/squares/web) | Squares frontend (`squares.maxstash.io`) | `maxmorhardt/squares` |
| [`apps/squares/contests`](apps/squares/contests) | Squares contests service | `maxmorhardt/squares-contests` |
| [`apps/squares/games`](apps/squares/games) | Squares schedule and live scores | `maxmorhardt/squares-games` |
| [`apps/squares/accounts`](apps/squares/accounts) | Squares profiles and contact form | `maxmorhardt/squares-accounts` |
| [`apps/squares/realtime`](apps/squares/realtime) | Squares live updates (server-sent events) | `maxmorhardt/squares-realtime` |
| [`libs`](libs) | Go libraries shared by the services (`platform`, `squares`) | - |

Helm charts live in [`maxmorhardt/charts`](https://github.com/maxmorhardt/charts) and release on their own. Cluster state (which chart version and image tag each app runs) lives in [`maxmorhardt/k8s`](https://github.com/maxmorhardt/k8s). Shared CI lives in [`maxmorhardt/workflows`](https://github.com/maxmorhardt/workflows).

## Releases

[release-please](https://github.com/googleapis/release-please) manages every app in [`release-please-config.json`](release-please-config.json). Tags are `<component>/<version>`, for example `squares-contests/1.2.0`. A tag builds and pushes the app's image and commits the new `image.tag` to its Argo CD Application in `k8s`.

## CI

[`ci.yml`](.github/workflows/ci.yml) runs on pull requests and only builds what changed; a change under `libs` tests every Go service. `CI Complete` is the single required check.

The Go modules are tied together by `replace` directives, so each builds on its own. [`go.work`](go.work) only lets editors see all of them at once.

## Git hooks

[`.githooks/pre-commit`](.githooks/pre-commit) runs each UI's own lint-staged when its files are staged, and gofmt on staged Go files. `pnpm install` in either UI turns it on (`git config core.hooksPath .githooks`); there is no npm project at the root.

## Licenses

The repository is Apache-2.0 ([`LICENSE`](LICENSE)) except `apps/squares/**`, which is PolyForm Noncommercial 1.0.0 (see the `LICENSE` in each squares app).
