# Changelog

## [4.0.0](https://github.com/maxmorhardt/maxstash/compare/squares/3.1.0...squares/4.0.0) (2026-10-14)


### ⚠ BREAKING CHANGES

* **squares:** bulk random claims, REST methods, simpler contest filters ([#86](https://github.com/maxmorhardt/maxstash/issues/86))

### Features

* **squares:** bulk random claims, REST methods, simpler contest filters ([#86](https://github.com/maxmorhardt/maxstash/issues/86)) ([2561417](https://github.com/maxmorhardt/maxstash/commit/2561417aa5f646f99d8697e4bbff6a83eb09b91f))

## [3.1.0](https://github.com/maxmorhardt/maxstash/compare/squares/3.0.0...squares/3.1.0) (2026-10-14)


### Features

* **squares:** one contest feed, gateway rate limiting, package renames ([#79](https://github.com/maxmorhardt/maxstash/issues/79)) ([1005829](https://github.com/maxmorhardt/maxstash/commit/10058296d9d005314e3f10415366dd8f8df6ec54))
* **squares:** one infinite-scrolling contest list and a what-if scoreboard ([89987d2](https://github.com/maxmorhardt/maxstash/commit/89987d25bbd12d5a25940f6446df8f7477b932eb))

## [3.0.0](https://github.com/maxmorhardt/maxstash/compare/squares/2.2.1...squares/3.0.0) (2026-10-13)


### ⚠ BREAKING CHANGES

* the maxstash public monorepo ([#69](https://github.com/maxmorhardt/maxstash/issues/69))
* charts/ and apps/*/chart are removed; use the charts repo.
* squares-api is replaced by squares-contests, squares-games, squares-accounts, and squares-realtime, each with its own chart, image, and secret. Event ids sent to browsers are now <ms>-<seq> strings.
* **squares:** requires the split squares api (realtime service at /squares/events); the WebSocket endpoint and chat no longer exist.

### Features

* **squares:** stream contest updates over server-sent events and drop chat ([f181d6b](https://github.com/maxmorhardt/maxstash/commit/f181d6b87899be5802809879002a6c063e4041ee))
* the maxstash public monorepo ([#69](https://github.com/maxmorhardt/maxstash/issues/69)) ([e15903c](https://github.com/maxmorhardt/maxstash/commit/e15903c095f902320c36cbead94841fec57fe081))


### Bug Fixes

* **squares:** stop sending a signed-out user's token, and show toasts one at a time ([531d3dd](https://github.com/maxmorhardt/maxstash/commit/531d3dde87573244bf8bcea1a2468aab165379b5))


### Code Refactoring

* move charts to the charts repo, flatten libs, drop the root npm project and e2e ([d536e4c](https://github.com/maxmorhardt/maxstash/commit/d536e4c8e85cf5567737cef637e32cc364675ad7))
* split the squares api into four applications on shared libraries ([38f9fcb](https://github.com/maxmorhardt/maxstash/commit/38f9fcbe066b3f2cabc4d189bb49c3dad9025f57))

## [2.2.1](https://github.com/maxmorhardt/squares/compare/2.2.0...2.2.1) (2026-10-04)


### Bug Fixes

* **auth:** pick the mobile client on phones that were already signed in ([#91](https://github.com/maxmorhardt/squares/issues/91)) ([c68d00a](https://github.com/maxmorhardt/squares/commit/c68d00a709a09ca375751407758d65d6473fe503))

## [2.2.0](https://github.com/maxmorhardt/squares/compare/2.1.1...2.2.0) (2026-09-27)


### Features

* **auth:** keep phone and computer sessions signed in together ([#88](https://github.com/maxmorhardt/squares/issues/88)) ([971832d](https://github.com/maxmorhardt/squares/commit/971832d2fba0bc7ccbcaa07afc261ed2dea56bb3))
* multi-square random claim controls ([#84](https://github.com/maxmorhardt/squares/issues/84)) ([30bd455](https://github.com/maxmorhardt/squares/commit/30bd455404d8e6ead59e511095fe4b90ae8870de))

## [2.1.1](https://github.com/maxmorhardt/squares/compare/2.1.0...2.1.1) (2026-09-20)


### Bug Fixes

* **deps:** update all non-major dependencies ([#77](https://github.com/maxmorhardt/squares/issues/77)) ([227bda8](https://github.com/maxmorhardt/squares/commit/227bda80f62363189ee9d97121f686eba55df78c))

## [2.1.0](https://github.com/maxmorhardt/squares/compare/2.0.5...2.1.0) (2026-09-13)


### Features

* multi-square random claim controls ([#80](https://github.com/maxmorhardt/squares/issues/80)) ([d54206a](https://github.com/maxmorhardt/squares/commit/d54206a1af933a2cfd31b77f830771050b266cf1))

## [2.0.5](https://github.com/maxmorhardt/squares/compare/2.0.4...2.0.5) (2026-09-02)


### Bug Fixes

* **deps:** update all non-major dependencies ([#75](https://github.com/maxmorhardt/squares/issues/75)) ([699f6da](https://github.com/maxmorhardt/squares/commit/699f6da1c66df065e6f9de1f39d43954ccef7b62))

## [2.0.4](https://github.com/maxmorhardt/squares/compare/2.0.3...2.0.4) (2026-07-28)


### Bug Fixes

* enforce curly braces and tighten config ([#68](https://github.com/maxmorhardt/squares/issues/68)) ([8ab3409](https://github.com/maxmorhardt/squares/commit/8ab34093f1e1505bb764c15508cb9d47ac023175))
* migrate app imports to react-router v8 ([#64](https://github.com/maxmorhardt/squares/issues/64)) ([75c63a5](https://github.com/maxmorhardt/squares/commit/75c63a57a22a5d006f700068352c6f8d295a8173))

## [2.0.3](https://github.com/maxmorhardt/squares/compare/2.0.2...2.0.3) (2026-07-23)


### Bug Fixes

* learn more mobile performance ([#60](https://github.com/maxmorhardt/squares/issues/60)) ([dae73ce](https://github.com/maxmorhardt/squares/commit/dae73ce0b06b11c42ffafa36426b1876e15c15ad))

## [2.0.2](https://github.com/maxmorhardt/squares/compare/2.0.1...2.0.2) (2026-07-23)


### Bug Fixes

* switch header nav to links and tune caching ([#58](https://github.com/maxmorhardt/squares/issues/58)) ([3cb050f](https://github.com/maxmorhardt/squares/commit/3cb050f661a166828cca0b0739b682eae2944a1e))

## [2.0.1](https://github.com/maxmorhardt/squares/compare/2.0.0...2.0.1) (2026-07-23)


### Bug Fixes

* refine leaderboard states and tighten layouts ([#55](https://github.com/maxmorhardt/squares/issues/55)) ([25affbe](https://github.com/maxmorhardt/squares/commit/25affbe0ac26c3a633fd9df670601306a59f1c9c))

## [2.0.0](https://github.com/maxmorhardt/squares/compare/1.3.1...2.0.0) (2026-07-22)


### ⚠ BREAKING CHANGES

* ssg and leaderboard feature ([#52](https://github.com/maxmorhardt/squares/issues/52))

### Features

* ssg and leaderboard feature ([#52](https://github.com/maxmorhardt/squares/issues/52)) ([1b494d0](https://github.com/maxmorhardt/squares/commit/1b494d0a83df1727de53994dc23db6ad2aba18c6))

## [1.3.1](https://github.com/maxmorhardt/squares/compare/1.3.0...1.3.1) (2026-07-19)


### Bug Fixes

* error handling and improve responsive layout ([#48](https://github.com/maxmorhardt/squares/issues/48)) ([46309ce](https://github.com/maxmorhardt/squares/commit/46309cede160473fce2acf8ce57d30da9715253a))

## [1.3.0](https://github.com/maxmorhardt/squares/compare/1.2.0...1.3.0) (2026-07-19)


### Features

* centralize stats and harden square claims ([#44](https://github.com/maxmorhardt/squares/issues/44)) ([9869d70](https://github.com/maxmorhardt/squares/commit/9869d70bce41c09c6dca776d2bbe7a662e2130ef))

## [1.2.0](https://github.com/maxmorhardt/squares/compare/1.1.2...1.2.0) (2026-07-19)


### Features

* enhance user profile handling and refactor authentication flow ([#38](https://github.com/maxmorhardt/squares/issues/38)) ([0781a69](https://github.com/maxmorhardt/squares/commit/0781a694127f8d150909ca6d590c36078865436b))


### Bug Fixes

* **deps:** update pnpm to v11.8.0 [security] ([#40](https://github.com/maxmorhardt/squares/issues/40)) ([6f083e6](https://github.com/maxmorhardt/squares/commit/6f083e60168ff29834db26b544828c6cce10dbaa))
* improve auth recovery and contest leave UX ([#43](https://github.com/maxmorhardt/squares/issues/43)) ([dc368e3](https://github.com/maxmorhardt/squares/commit/dc368e3be9176d3ede90cc41b2bc9eb56e320220))

## [1.1.2](https://github.com/maxmorhardt/squares/compare/1.1.1...1.1.2) (2026-07-15)


### Bug Fixes

* refine contest UI and improve game fetching on auth readiness ([#36](https://github.com/maxmorhardt/squares/issues/36)) ([e70477f](https://github.com/maxmorhardt/squares/commit/e70477f23ae0eaed686e7d5335f2f11a14ee111a))

## [1.1.1](https://github.com/maxmorhardt/squares/compare/1.1.0...1.1.1) (2026-07-15)


### Bug Fixes

* gate create page game fetch on auth readiness ([#34](https://github.com/maxmorhardt/squares/issues/34)) ([de86541](https://github.com/maxmorhardt/squares/commit/de8654151f90c2c4792a362a0782866318d57b95))

## [1.1.0](https://github.com/maxmorhardt/squares/compare/1.0.0...1.1.0) (2026-07-14)


### Features

* viewer role fix and game link ([#32](https://github.com/maxmorhardt/squares/issues/32)) ([75851ba](https://github.com/maxmorhardt/squares/commit/75851ba2bbcc29993c55f0568490c5a56da5ce1d))

## 1.0.0 (2026-07-14)

### Features

- move to v0 ([#31](https://github.com/maxmorhardt/squares/issues/31)) ([65f21b4](https://github.com/maxmorhardt/squares/commit/65f21b4e83a933d3860d889f6a5793b386503cdf))
