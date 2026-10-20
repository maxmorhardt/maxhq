# Changelog

## [2.0.0](https://github.com/maxmorhardt/maxhq/compare/squares/1.0.0...squares/2.0.0) (2026-10-20)


### ⚠ BREAKING CHANGES

* rename to maxhq, serve prod through Cloudflare and dev over Tailscale ([#95](https://github.com/maxmorhardt/maxhq/issues/95))
* **squares:** bulk random claims, REST methods, simpler contest filters ([#86](https://github.com/maxmorhardt/maxhq/issues/86))
* the maxstash public monorepo ([#69](https://github.com/maxmorhardt/maxhq/issues/69))
* charts/ and apps/*/chart are removed; use the charts repo.
* squares-api is replaced by squares-contests, squares-games, squares-accounts, and squares-realtime, each with its own chart, image, and secret. Event ids sent to browsers are now <ms>-<seq> strings.
* **squares:** requires the split squares api (realtime service at /squares/events); the WebSocket endpoint and chat no longer exist.
* ssg and leaderboard feature ([#52](https://github.com/maxmorhardt/maxhq/issues/52))
* move to v0 ([#31](https://github.com/maxmorhardt/maxhq/issues/31))
* reset versions with proper config ([#28](https://github.com/maxmorhardt/maxhq/issues/28))
* reset all chart versions ([#26](https://github.com/maxmorhardt/maxhq/issues/26))
* reset all chart versions
* add release automation and normalize charts ([#24](https://github.com/maxmorhardt/maxhq/issues/24))

### Features

* add release automation and normalize charts ([#24](https://github.com/maxmorhardt/maxhq/issues/24)) ([86a6539](https://github.com/maxmorhardt/maxhq/commit/86a653987883e6110d69754c01099d04413481b4))
* **auth:** keep phone and computer sessions signed in together ([#88](https://github.com/maxmorhardt/maxhq/issues/88)) ([7b44f00](https://github.com/maxmorhardt/maxhq/commit/7b44f002129259e56984fa53f1355c9fddc86d61))
* centralize stats and harden square claims ([#44](https://github.com/maxmorhardt/maxhq/issues/44)) ([65ffd0e](https://github.com/maxmorhardt/maxhq/commit/65ffd0edf61d40d09a56b0ed80c79d3f796ca2b7))
* enhance user profile handling and refactor authentication flow ([#38](https://github.com/maxmorhardt/maxhq/issues/38)) ([19a6471](https://github.com/maxmorhardt/maxhq/commit/19a6471ea444f49520782865926706a449d2d09c))
* move to v0 ([#31](https://github.com/maxmorhardt/maxhq/issues/31)) ([356f5c2](https://github.com/maxmorhardt/maxhq/commit/356f5c2f4eb162b602183814a5b1298e7ee04b28))
* multi-square random claim controls ([#80](https://github.com/maxmorhardt/maxhq/issues/80)) ([f8c7f5c](https://github.com/maxmorhardt/maxhq/commit/f8c7f5ce1901fac02efa0c3cead33ccefba00b2b))
* multi-square random claim controls ([#84](https://github.com/maxmorhardt/maxhq/issues/84)) ([3447d99](https://github.com/maxmorhardt/maxhq/commit/3447d997cc45b3ef2752f1767424b9d6b1ff53b3))
* release-please w/ smoke tests ([c07fcab](https://github.com/maxmorhardt/maxhq/commit/c07fcabb8162a8f5155c148b37f6ed0fe00be4f8))
* rename to maxhq, serve prod through Cloudflare and dev over Tailscale ([#95](https://github.com/maxmorhardt/maxhq/issues/95)) ([43590af](https://github.com/maxmorhardt/maxhq/commit/43590af3ddefe12a70829f74c89072b429c88a44))
* reset all chart versions ([a671936](https://github.com/maxmorhardt/maxhq/commit/a6719361aeae099f2d958e274887613092106d0b))
* reset all chart versions ([#26](https://github.com/maxmorhardt/maxhq/issues/26)) ([e266218](https://github.com/maxmorhardt/maxhq/commit/e2662187f34f89fa9d6e23b23224ad48e2bdc9a8))
* reset versions with proper config ([#28](https://github.com/maxmorhardt/maxhq/issues/28)) ([d64e51b](https://github.com/maxmorhardt/maxhq/commit/d64e51bcc21b82c9f5fff361fbb11e8352dea24f))
* separate image and chart releases, Go 1.27, and Terraform-managed environments and DNS ([#100](https://github.com/maxmorhardt/maxhq/issues/100)) ([51853c3](https://github.com/maxmorhardt/maxhq/commit/51853c3cc07a24e021c4b03c1bbd1be9df54cff6))
* **squares:** bulk random claims, REST methods, simpler contest filters ([#86](https://github.com/maxmorhardt/maxhq/issues/86)) ([2561417](https://github.com/maxmorhardt/maxhq/commit/2561417aa5f646f99d8697e4bbff6a83eb09b91f))
* **squares:** local stack, shared build, faster stats, library cleanups, and fixes ([#89](https://github.com/maxmorhardt/maxhq/issues/89)) ([7b62b33](https://github.com/maxmorhardt/maxhq/commit/7b62b33e87d2eec49f5aa7addc2904ac0cc782ed))
* **squares:** one contest feed, gateway rate limiting, package renames ([#79](https://github.com/maxmorhardt/maxhq/issues/79)) ([1005829](https://github.com/maxmorhardt/maxhq/commit/10058296d9d005314e3f10415366dd8f8df6ec54))
* **squares:** one infinite-scrolling contest list and a what-if scoreboard ([89987d2](https://github.com/maxmorhardt/maxhq/commit/89987d25bbd12d5a25940f6446df8f7477b932eb))
* **squares:** stream contest updates over server-sent events and drop chat ([f181d6b](https://github.com/maxmorhardt/maxhq/commit/f181d6b87899be5802809879002a6c063e4041ee))
* ssg and leaderboard feature ([#52](https://github.com/maxmorhardt/maxhq/issues/52)) ([845f337](https://github.com/maxmorhardt/maxhq/commit/845f337480ac4b34bc60b79f6fad1b08af069ba3))
* the maxstash public monorepo ([#69](https://github.com/maxmorhardt/maxhq/issues/69)) ([e15903c](https://github.com/maxmorhardt/maxhq/commit/e15903c095f902320c36cbead94841fec57fe081))
* viewer role fix and game link ([#32](https://github.com/maxmorhardt/maxhq/issues/32)) ([476b64c](https://github.com/maxmorhardt/maxhq/commit/476b64c3ee00fcd6b0059b601b389ac7c96544cf))


### Bug Fixes

* **auth:** pick the mobile client on phones that were already signed in ([#91](https://github.com/maxmorhardt/maxhq/issues/91)) ([398cf86](https://github.com/maxmorhardt/maxhq/commit/398cf864045bab65f814410455d9256e0ea729d7))
* **deps:** update all non-major dependencies ([#75](https://github.com/maxmorhardt/maxhq/issues/75)) ([8554fe4](https://github.com/maxmorhardt/maxhq/commit/8554fe48c68d22c753cdbb04bea8de115fa6d141))
* **deps:** update all non-major dependencies ([#77](https://github.com/maxmorhardt/maxhq/issues/77)) ([3c00fe2](https://github.com/maxmorhardt/maxhq/commit/3c00fe27adc5006402b7ce1fdb689626c4fcb98c))
* **deps:** update pnpm to v11.8.0 [security] ([#40](https://github.com/maxmorhardt/maxhq/issues/40)) ([913e44c](https://github.com/maxmorhardt/maxhq/commit/913e44c022361bae69ff6ed07a40cb72b476f390))
* enforce curly braces and tighten config ([#68](https://github.com/maxmorhardt/maxhq/issues/68)) ([6d59153](https://github.com/maxmorhardt/maxhq/commit/6d591533c70d6b0da5ea7c7c0be6a3998749df9f))
* error handling and improve responsive layout ([#48](https://github.com/maxmorhardt/maxhq/issues/48)) ([95be145](https://github.com/maxmorhardt/maxhq/commit/95be1451529ec56e0588f8f62cf322dea714919b))
* gate create page game fetch on auth readiness ([#34](https://github.com/maxmorhardt/maxhq/issues/34)) ([076bece](https://github.com/maxmorhardt/maxhq/commit/076becebf637fbc8e3e7397358eb6540a63d8900))
* improve auth recovery and contest leave UX ([#43](https://github.com/maxmorhardt/maxhq/issues/43)) ([bf5313f](https://github.com/maxmorhardt/maxhq/commit/bf5313ffe66e73fc761bacf31296d2e1c6c1c0b4))
* learn more mobile performance ([#60](https://github.com/maxmorhardt/maxhq/issues/60)) ([8ad48ed](https://github.com/maxmorhardt/maxhq/commit/8ad48ed794247a28ecb058d4e571c7581ece4107))
* migrate app imports to react-router v8 ([#64](https://github.com/maxmorhardt/maxhq/issues/64)) ([7ab7d83](https://github.com/maxmorhardt/maxhq/commit/7ab7d83b12df53a87cc9701c516728c0f030be0c))
* refine contest UI and improve game fetching on auth readiness ([#36](https://github.com/maxmorhardt/maxhq/issues/36)) ([04aa839](https://github.com/maxmorhardt/maxhq/commit/04aa839595b385cdd3d4082c6787b83b053a645f))
* refine leaderboard states and tighten layouts ([#55](https://github.com/maxmorhardt/maxhq/issues/55)) ([fa22708](https://github.com/maxmorhardt/maxhq/commit/fa2270865124e5485fe32e4c56f56afb9533790b))
* require explicit image tags in Helm charts ([#40](https://github.com/maxmorhardt/maxhq/issues/40)) ([29c91fa](https://github.com/maxmorhardt/maxhq/commit/29c91fa2780d994a29896dffd261082408e87c8e))
* **squares:** stop sending a signed-out user's token, and show toasts one at a time ([531d3dd](https://github.com/maxmorhardt/maxhq/commit/531d3dde87573244bf8bcea1a2468aab165379b5))
* switch header nav to links and tune caching ([#58](https://github.com/maxmorhardt/maxhq/issues/58)) ([a2d96d3](https://github.com/maxmorhardt/maxhq/commit/a2d96d33e757373f1db99198f2d08a14e1dbfe46))
* use chart appVersion for image tags by default ([#32](https://github.com/maxmorhardt/maxhq/issues/32)) ([689258e](https://github.com/maxmorhardt/maxhq/commit/689258ecc7983531fdaa534dd897041feae277f8))


### Code Refactoring

* move charts to the charts repo, flatten libs, drop the root npm project and e2e ([d536e4c](https://github.com/maxmorhardt/maxhq/commit/d536e4c8e85cf5567737cef637e32cc364675ad7))
* split the squares api into four applications on shared libraries ([38f9fcb](https://github.com/maxmorhardt/maxhq/commit/38f9fcbe066b3f2cabc4d189bb49c3dad9025f57))
