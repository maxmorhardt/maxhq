# Changelog

## [2.4.0](https://github.com/maxmorhardt/maxhq/compare/squares/2.3.1...squares/2.4.0) (2026-10-30)


### Features

* show halftime, read finished contests once, and brighten skeletons ([#172](https://github.com/maxmorhardt/maxhq/issues/172)) ([a8ab74e](https://github.com/maxmorhardt/maxhq/commit/a8ab74eaeca60d84595aecea498de306d85e1ad4))

## [2.3.1](https://github.com/maxmorhardt/maxhq/compare/squares/2.3.0...squares/2.3.1) (2026-10-29)


### Bug Fixes

* **squares:** fully opaque apple-touch icon ([#168](https://github.com/maxmorhardt/maxhq/issues/168)) ([d3af5a3](https://github.com/maxmorhardt/maxhq/commit/d3af5a3655dfc5796e058490be305a524e7073b0))

## [2.3.0](https://github.com/maxmorhardt/maxhq/compare/squares/2.2.1...squares/2.3.0) (2026-10-29)


### Features

* handle canceled games, pay quarters at the break, and add a Cloudflare tunnel ([#159](https://github.com/maxmorhardt/maxhq/issues/159)) ([21afac5](https://github.com/maxmorhardt/maxhq/commit/21afac59d555c8f81a1f2fee6c5e7f95ed31f5ca))

## [2.2.1](https://github.com/maxmorhardt/maxhq/compare/squares/2.2.0...squares/2.2.1) (2026-10-26)


### Bug Fixes

* version icon links so Safari drops its cached favicons ([#155](https://github.com/maxmorhardt/maxhq/issues/155)) ([d876b81](https://github.com/maxmorhardt/maxhq/commit/d876b818c982dbdf53e4d868845d1ed08b0486e6))

## [2.2.0](https://github.com/maxmorhardt/maxhq/compare/squares/2.1.1...squares/2.2.0) (2026-10-26)


### Features

* new maxhq logo, refreshed squares logo, and crisp favicons ([#152](https://github.com/maxmorhardt/maxhq/issues/152)) ([8d82509](https://github.com/maxmorhardt/maxhq/commit/8d82509cc0116516f00e0669a7e80721900d4fe7))

## [2.1.1](https://github.com/maxmorhardt/maxhq/compare/squares/2.1.0...squares/2.1.1) (2026-10-25)


### Bug Fixes

* **squares:** show contest player names the same way everywhere ([#146](https://github.com/maxmorhardt/maxhq/issues/146)) ([fead300](https://github.com/maxmorhardt/maxhq/commit/fead3008d8fcc99e224ec6008a1e4e5b7d362a2b))

## [2.1.0](https://github.com/maxmorhardt/maxhq/compare/squares/2.0.4...squares/2.1.0) (2026-10-25)


### Features

* gzip, uncached asset 404s, and a post-deploy Cloudflare purge for maxhq and squares ([#137](https://github.com/maxmorhardt/maxhq/issues/137)) ([5183587](https://github.com/maxmorhardt/maxhq/commit/518358752204fd01a32cc2f775663c9bf900377f))

## [2.0.4](https://github.com/maxmorhardt/maxhq/compare/squares/2.0.3...squares/2.0.4) (2026-10-25)


### Bug Fixes

* **squares:** drop sessions the provider keeps rejecting ([#136](https://github.com/maxmorhardt/maxhq/issues/136)) ([a86da74](https://github.com/maxmorhardt/maxhq/commit/a86da743f28deca9b487ddb8fdf32349d4e1249c))
* **squares:** mobile ui fixes and read replica resilience ([#131](https://github.com/maxmorhardt/maxhq/issues/131)) ([e2fd303](https://github.com/maxmorhardt/maxhq/commit/e2fd3039f7144d8e02201c49e5e7b24f45face41))

## [2.0.3](https://github.com/maxmorhardt/maxhq/compare/squares/2.0.2...squares/2.0.3) (2026-10-24)


### Bug Fixes

* **squares:** quarter results, contest locks, quieter gorm logs, and 60s scrapes ([#127](https://github.com/maxmorhardt/maxhq/issues/127)) ([0b2b607](https://github.com/maxmorhardt/maxhq/commit/0b2b6073cd2a47ef47249808999b86337ff2eca0))

## [2.0.2](https://github.com/maxmorhardt/maxhq/compare/squares/2.0.1...squares/2.0.2) (2026-10-23)


### Bug Fixes

* **squares:** board labels, live quarter results, realtime gaps, and a contests restructure ([#126](https://github.com/maxmorhardt/maxhq/issues/126)) ([66bee00](https://github.com/maxmorhardt/maxhq/commit/66bee000e8cbeef801ddaaeecee92ce9ac93f158))

## [2.0.1](https://github.com/maxmorhardt/maxhq/compare/squares/2.0.0...squares/2.0.1) (2026-10-22)


### Bug Fixes

* **deps:** update all non-major dependencies ([#118](https://github.com/maxmorhardt/maxhq/issues/118)) ([2539652](https://github.com/maxmorhardt/maxhq/commit/2539652dad803d6d24b3e4c9ce42495144ba6e4c))
* move go libs and tidy code ([#120](https://github.com/maxmorhardt/maxhq/issues/120)) ([50d5227](https://github.com/maxmorhardt/maxhq/commit/50d52270b54442348e1e36e55ce988ce2c0e83d6))

## [2.0.0](https://github.com/maxmorhardt/maxhq/compare/squares/1.0.0...squares/2.0.0) (2026-10-21)


### ⚠ BREAKING CHANGES

* **squares:** live games only, season-wide game sync, and a redesigned web app ([#110](https://github.com/maxmorhardt/maxhq/issues/110))

### Features

* Discord-only cloudflare-cidr in prod, Envoy PDB, and dashboards out of the charts ([#108](https://github.com/maxmorhardt/maxhq/issues/108)) ([75b4ce1](https://github.com/maxmorhardt/maxhq/commit/75b4ce180f10eac56df58b4d84c2192ba1e1f4b6))
* **squares:** live games only, season-wide game sync, and a redesigned web app ([#110](https://github.com/maxmorhardt/maxhq/issues/110)) ([10f6b81](https://github.com/maxmorhardt/maxhq/commit/10f6b814e27532f47022709ddc2a16e3117c5e58))
* **squares:** season calendar, locked full boards, join page, and the CodeQL email fix ([#112](https://github.com/maxmorhardt/maxhq/issues/112)) ([fc2d1e9](https://github.com/maxmorhardt/maxhq/commit/fc2d1e9e3af663fd5abffb2d4635279126dcb304))
* **squares:** typed contest events and a rebuilt web data layer ([#107](https://github.com/maxmorhardt/maxhq/issues/107)) ([2369a65](https://github.com/maxmorhardt/maxhq/commit/2369a65319eecf766c0480b8595f3e678aea0635))


### Bug Fixes

* **deps:** update all non-major dependencies ([#88](https://github.com/maxmorhardt/maxhq/issues/88)) ([f54e45f](https://github.com/maxmorhardt/maxhq/commit/f54e45fbf6efc09b83a444d1c0735780cbdc0efa))
