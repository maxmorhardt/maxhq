# Changelog

## [1.2.2](https://github.com/maxmorhardt/maxhq/compare/libs/go/v1.2.1...libs/go/v1.2.2) (2026-11-06)


### Bug Fixes

* **libs:** drop the participant event names and snapshot key ([#222](https://github.com/maxmorhardt/maxhq/issues/222)) ([d774e54](https://github.com/maxmorhardt/maxhq/commit/d774e544631d050a51ccb2bebcd563a6ed5ee9ed))

## [1.2.1](https://github.com/maxmorhardt/maxhq/compare/libs/go/v1.2.0...libs/go/v1.2.1) (2026-11-06)


### Bug Fixes

* **deps:** update module github.com/klauspost/compress to v1.20.2 [security] ([#214](https://github.com/maxmorhardt/maxhq/issues/214)) ([5464a81](https://github.com/maxmorhardt/maxhq/commit/5464a8104eeac32cafae85ef782166ddb48f435a))

## [1.2.0](https://github.com/maxmorhardt/maxhq/compare/libs/go/v1.1.0...libs/go/v1.2.0) (2026-11-06)


### Features

* **squares:** add player events and tighten player controls ([#213](https://github.com/maxmorhardt/maxhq/issues/213)) ([482caaa](https://github.com/maxmorhardt/maxhq/commit/482caaa53a1b23b5fa2baa58f946a0a1b5c6fb7c))


### Bug Fixes

* **deps:** update all non-major dependencies ([#210](https://github.com/maxmorhardt/maxhq/issues/210)) ([e220497](https://github.com/maxmorhardt/maxhq/commit/e2204972b458a16e4c9d60c7633d154285ff973f))

## [1.1.0](https://github.com/maxmorhardt/maxhq/compare/libs/go/v1.0.0...libs/go/v1.1.0) (2026-11-05)


### Features

* **squares:** visitor insights ([#207](https://github.com/maxmorhardt/maxhq/issues/207)) ([494c829](https://github.com/maxmorhardt/maxhq/commit/494c829e0eef51c053b434635c442b5a904e750a))

## 1.0.0 (2026-11-03)


### ⚠ BREAKING CHANGES

* charts/ and apps/*/chart are removed; use the charts repo.
* squares-api is replaced by squares-contests, squares-games, squares-accounts, and squares-realtime, each with its own chart, image, and secret. Event ids sent to browsers are now <ms>-<seq> strings.

### Features

* add microsoft sign-in, faro monitoring, and request tracing ([#180](https://github.com/maxmorhardt/maxhq/issues/180)) ([baf42fb](https://github.com/maxmorhardt/maxhq/commit/baf42fbe41c04a978eed50f3b5bd0bd879234b62))
* handle canceled games, pay quarters at the break, and add a Cloudflare tunnel ([#159](https://github.com/maxmorhardt/maxhq/issues/159)) ([21afac5](https://github.com/maxmorhardt/maxhq/commit/21afac59d555c8f81a1f2fee6c5e7f95ed31f5ca))
* multi-square random claim controls ([#84](https://github.com/maxmorhardt/maxhq/issues/84)) ([3447d99](https://github.com/maxmorhardt/maxhq/commit/3447d997cc45b3ef2752f1767424b9d6b1ff53b3))
* **repo:** give each squares service its own go module ([#200](https://github.com/maxmorhardt/maxhq/issues/200)) ([a9e10a2](https://github.com/maxmorhardt/maxhq/commit/a9e10a221037c1a9be68ef3b947d96ac256cc5d0))
* **squares-contests:** hide player emails and full names, cap contests, add security headers ([#182](https://github.com/maxmorhardt/maxhq/issues/182)) ([acda671](https://github.com/maxmorhardt/maxhq/commit/acda671095db819712ce0e2982e00cc28befec90))


### Bug Fixes

* move go libs and tidy code ([#120](https://github.com/maxmorhardt/maxhq/issues/120)) ([50d5227](https://github.com/maxmorhardt/maxhq/commit/50d52270b54442348e1e36e55ce988ce2c0e83d6))
* **squares:** board labels, live quarter results, realtime gaps, and a contests restructure ([#126](https://github.com/maxmorhardt/maxhq/issues/126)) ([66bee00](https://github.com/maxmorhardt/maxhq/commit/66bee000e8cbeef801ddaaeecee92ce9ac93f158))
* **squares:** count only real sign-ups and read only the primary ([#190](https://github.com/maxmorhardt/maxhq/issues/190)) ([1f09e20](https://github.com/maxmorhardt/maxhq/commit/1f09e209441d8410b82c38f91bbc6ae89f4b9f05))
* **squares:** mobile ui fixes and read replica resilience ([#131](https://github.com/maxmorhardt/maxhq/issues/131)) ([e2fd303](https://github.com/maxmorhardt/maxhq/commit/e2fd3039f7144d8e02201c49e5e7b24f45face41))
* **squares:** quarter results, contest locks, quieter gorm logs, and 60s scrapes ([#127](https://github.com/maxmorhardt/maxhq/issues/127)) ([0b2b607](https://github.com/maxmorhardt/maxhq/commit/0b2b6073cd2a47ef47249808999b86337ff2eca0))
* **squares:** stop the participants dialog crash and fix the [#182](https://github.com/maxmorhardt/maxhq/issues/182) review findings ([#188](https://github.com/maxmorhardt/maxhq/issues/188)) ([8184bd5](https://github.com/maxmorhardt/maxhq/commit/8184bd54d0a36978924f3f2818bf104a75a59b90))


### Code Refactoring

* move charts to the charts repo, flatten libs, drop the root npm project and e2e ([d536e4c](https://github.com/maxmorhardt/maxhq/commit/d536e4c8e85cf5567737cef637e32cc364675ad7))
* split the squares api into four applications on shared libraries ([38f9fcb](https://github.com/maxmorhardt/maxhq/commit/38f9fcbe066b3f2cabc4d189bb49c3dad9025f57))
