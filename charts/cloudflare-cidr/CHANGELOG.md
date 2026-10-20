# Changelog

## [2.0.0](https://github.com/maxmorhardt/maxhq/compare/cloudflare-cidr-chart/1.0.0...cloudflare-cidr-chart/2.0.0) (2026-10-20)


### ⚠ BREAKING CHANGES

* rename to maxhq, serve prod through Cloudflare and dev over Tailscale ([#95](https://github.com/maxmorhardt/maxhq/issues/95))
* charts/ and apps/*/chart are removed; use the charts repo.
* reset versions with proper config ([#28](https://github.com/maxmorhardt/maxhq/issues/28))
* reset all chart versions ([#26](https://github.com/maxmorhardt/maxhq/issues/26))
* reset all chart versions

### Features

* bring the charts and infra tooling into the monorepo ([#92](https://github.com/maxmorhardt/maxhq/issues/92)) ([44d4e73](https://github.com/maxmorhardt/maxhq/commit/44d4e73c487e6f99c376862e021bb8ae45de7a5b))
* multi-square random claim controls ([#84](https://github.com/maxmorhardt/maxhq/issues/84)) ([3447d99](https://github.com/maxmorhardt/maxhq/commit/3447d997cc45b3ef2752f1767424b9d6b1ff53b3))
* rename to maxhq, serve prod through Cloudflare and dev over Tailscale ([#95](https://github.com/maxmorhardt/maxhq/issues/95)) ([43590af](https://github.com/maxmorhardt/maxhq/commit/43590af3ddefe12a70829f74c89072b429c88a44))
* reset all chart versions ([a671936](https://github.com/maxmorhardt/maxhq/commit/a6719361aeae099f2d958e274887613092106d0b))
* reset all chart versions ([#26](https://github.com/maxmorhardt/maxhq/issues/26)) ([e266218](https://github.com/maxmorhardt/maxhq/commit/e2662187f34f89fa9d6e23b23224ad48e2bdc9a8))
* reset versions with proper config ([#28](https://github.com/maxmorhardt/maxhq/issues/28)) ([d64e51b](https://github.com/maxmorhardt/maxhq/commit/d64e51bcc21b82c9f5fff361fbb11e8352dea24f))
* separate image and chart releases, Go 1.27, and Terraform-managed environments and DNS ([#100](https://github.com/maxmorhardt/maxhq/issues/100)) ([51853c3](https://github.com/maxmorhardt/maxhq/commit/51853c3cc07a24e021c4b03c1bbd1be9df54cff6))


### Bug Fixes

* use chart appVersion for image tags by default ([#32](https://github.com/maxmorhardt/maxhq/issues/32)) ([689258e](https://github.com/maxmorhardt/maxhq/commit/689258ecc7983531fdaa534dd897041feae277f8))


### Code Refactoring

* move charts to the charts repo, flatten libs, drop the root npm project and e2e ([d536e4c](https://github.com/maxmorhardt/maxhq/commit/d536e4c8e85cf5567737cef637e32cc364675ad7))
