# Changelog

## [0.4.0](https://github.com/C-Pettersson/poe-stacked-deck-counter/compare/v0.3.0...v0.4.0) (2026-07-11)

### ⚠ BREAKING CHANGES

* the app identity, user-data location, preload API, and poe.how export schema have changed.

### Features

* added contribute documentation ([3d5b464](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/3d5b464f71c1bb4bc9cbb06a7fbd8f3ec7ba36e7))
* **data:** add local Path of Exile item metadata ([64f5b57](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/64f5b57ce89afc0411cd555c76985921b04623a2))
* **events:** automate encounter drop tracking ([e32de1d](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/e32de1d114f09e7f722cf6c5825c6070c3fc0ebc))
* **library:** organize saved runs by study type ([7dbeedc](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/7dbeedc5ab347ed745af8b23b71e4c29c47d55cc))
* transform app into Wraeclast Field Notes ([44ab341](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/44ab341e486904914445ce878be492bcbb004a37))
* **ui:** add research books and rich item previews ([51d9797](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/51d979768a931d94baca6d5da370f04cbf02b58f))
* **ui:** redesign app as a smoked expedition journal ([9d65d25](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/9d65d25c7f94a2726cec5718c5a00ae185cbe91e))

## [0.3.0](https://github.com/C-Pettersson/poe-stacked-deck-counter/compare/v0.2.2...v0.3.0) (2026-07-07)

### Features

* add support to clear price cache ([b032e0f](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/b032e0f40c0e00475f5de45f5ca48ecdedea2b54))
* added contribute.md ([4543a60](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/4543a6084fe16e2fce1959e5727e583d253c9995))
* added local resources for currency icons ([b0cd56b](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/b0cd56bbba1aececde3e9bddc08874044c788db1))
* added log scanner cache with optional auto refresh ([1aaf3ec](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/1aaf3ece69d2aa051f1ad3bcb0323664952a5aef))
* added shared currency formatter ([4199d56](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/4199d56b933ae8c111029c1b369505c835cfb01b))
* added support for fixed stacked deck pricing ([0fae2e8](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/0fae2e81f4c6ad07631d45ea57b228f8928ac870))
* **currency:** display prices with orb icons ([2a20abf](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/2a20abf5a67000a14569fcf61699cf83ceced9e2))
* **data:** add league filter ([da9a089](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/da9a0896aca717a9a867c377b8750ab7d4ccd799))
* **data:** add sortable table columns ([d9f4c3f](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/d9f4c3f8d8b5e2b2b88bff7cea7e4dda5401fc9a))
* **pricing:** add poe.watch price source ([eda37b5](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/eda37b51aaa9d139c19f6191a8f4b90be23f53a6))
* qol changes ([adae5a8](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/adae5a8d1aa0ec6327f376b86f0eb53d3b5f0271))
* **settings:** add profit filters ([2416460](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/24164605866daae7bfc03ea457718edee1da109f))
* **settings:** added check update ([3857330](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/3857330cbd17d244013a97afbf937a1a206c81e7))
* show card drop rates ([a84c50f](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/a84c50ff06e2107bcc4f5e04c1e3d80e0158ef2e))
* show card icon ([72b67b2](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/72b67b2c75a8f4e8b390a34944b98fcf18917ba4))

### Bug Fixes

* league handling when manually setting session league ([abf9ce8](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/abf9ce8d243dbf0963659b591e70b4b90f57ace1))
* **nav:** alignment of buttons ([968468b](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/968468b715a485e967912221b9d4ebdcb289b272))
* **preview:** use scan api for auto scan ([4105d68](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/4105d68dec09e2e287634de943d106a1206be79a))
* **pricing:** stacked deck now correctly use exchange pricing ([77fc8f0](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/77fc8f03a908a13ff45a9d2ee156239963bf8aff))
* **pricing:** use selected league for session prices ([8d597f5](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/8d597f506de3e88ca1e4d50ac0fb0d2ada595980))

### Performance Improvements

* **scanner:** speed up client log scans ([c8f36d7](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/c8f36d7d2ece25eda8c28edce41021a55f2ed1b0))

## [0.2.2](https://github.com/C-Pettersson/poe-stacked-deck-counter/compare/v0.2.1...v0.2.2) (2026-07-07)

### Bug Fixes

* **release:** publish github releases publicly ([00e7480](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/00e7480f3bd78ad8aa53e8438af34b3fde895699))

## [0.2.1](https://github.com/C-Pettersson/poe-stacked-deck-counter/compare/v0.2.0...v0.2.1) (2026-07-07)

### Bug Fixes

* **ci:** publish release artifacts ([39c71bb](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/39c71bb66da58873be6cc06ddd7ba499ab5fa72e))

## 0.2.0 (2026-07-07)

### Features

* **app:** add stacked deck counter ([4df7824](https://github.com/C-Pettersson/poe-stacked-deck-counter/commit/4df7824cd1afa5d2d1c7399eddeca54f71223fd4))
