# Changelog

## [2.0.0](https://github.com/maxmorhardt/maxhq/compare/squares-games/1.2.0...squares-games/2.0.0) (2026-10-19)


### ⚠ BREAKING CHANGES

* rename to maxhq, serve prod through Cloudflare and dev over Tailscale ([#95](https://github.com/maxmorhardt/maxhq/issues/95))

### Features

* rename to maxhq, serve prod through Cloudflare and dev over Tailscale ([#95](https://github.com/maxmorhardt/maxhq/issues/95)) ([43590af](https://github.com/maxmorhardt/maxhq/commit/43590af3ddefe12a70829f74c89072b429c88a44))

## [1.2.0](https://github.com/maxmorhardt/maxstash/compare/squares-games/1.1.0...squares-games/1.2.0) (2026-10-14)


### Features

* **squares:** local stack, shared build, faster stats, library cleanups, and fixes ([#89](https://github.com/maxmorhardt/maxstash/issues/89)) ([7b62b33](https://github.com/maxmorhardt/maxstash/commit/7b62b33e87d2eec49f5aa7addc2904ac0cc782ed))

## [1.1.0](https://github.com/maxmorhardt/maxstash/compare/squares-games/1.0.0...squares-games/1.1.0) (2026-10-14)


### Features

* **squares:** one contest feed, gateway rate limiting, package renames ([#79](https://github.com/maxmorhardt/maxstash/issues/79)) ([1005829](https://github.com/maxmorhardt/maxstash/commit/10058296d9d005314e3f10415366dd8f8df6ec54))

## 1.0.0 (2026-10-13)


### ⚠ BREAKING CHANGES

* the maxstash public monorepo ([#69](https://github.com/maxmorhardt/maxstash/issues/69))
* charts/ and apps/*/chart are removed; use the charts repo.
* squares-api is replaced by squares-contests, squares-games, squares-accounts, and squares-realtime, each with its own chart, image, and secret. Event ids sent to browsers are now <ms>-<seq> strings.

### Features

* the maxstash public monorepo ([#69](https://github.com/maxmorhardt/maxstash/issues/69)) ([e15903c](https://github.com/maxmorhardt/maxstash/commit/e15903c095f902320c36cbead94841fec57fe081))


### Bug Fixes

* **squares-contests:** update github.com/moby/go-archive to v0.3.0 for CVE-2026-17106 ([865bc47](https://github.com/maxmorhardt/maxstash/commit/865bc47bd6f7638db26ff3ab8e5536cf53e6899b))
* **squares-contests:** update golang.org/x/net to v0.60.0 for CVE-2026-78669 ([7c85c76](https://github.com/maxmorhardt/maxstash/commit/7c85c764b93931ccd8b918fcfd4a87f9f1301814))


### Code Refactoring

* move charts to the charts repo, flatten libs, drop the root npm project and e2e ([d536e4c](https://github.com/maxmorhardt/maxstash/commit/d536e4c8e85cf5567737cef637e32cc364675ad7))
* split the squares api into four applications on shared libraries ([38f9fcb](https://github.com/maxmorhardt/maxstash/commit/38f9fcbe066b3f2cabc4d189bb49c3dad9025f57))
