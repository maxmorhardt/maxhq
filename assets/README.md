# Assets

![SVG](https://img.shields.io/badge/svg-%23FFB13B.svg?style=for-the-badge&logo=svg&logoColor=white)
![License](https://img.shields.io/badge/license-CC%20BY--NC--ND%204.0-lightgrey?style=for-the-badge)

Brand assets for maxstash.io sites.

## Overview

This directory is the canonical source of truth for logos, wordmarks, and favicons used across the maxstash.io family of sites. It is not pulled in automatically by any build — assets are copied into each site's `public/` directory when the design changes.

## Contents

- **maxstash/** - `logo.svg`, `logo-mono.svg`, `wordmark-logo.svg`, and `favicon.svg` for the maxstash brand.
- **squares/** - `squares.png` plus a full `favicon/` set (`favicon.ico`, `android-chrome-*.png`, `apple-touch-icon.png`, `site.webmanifest`) for the Squares app.

## Usage

Copy the relevant files into a site's `public/` directory, for example:

```bash
# from the repository root
cp assets/squares/favicon/* apps/squares/web/public/
cp assets/maxstash/*.svg apps/maxstash/public/
```

The favicon set is generated from the logo by `scripts/favicon/gen_favicons.py` in the private `maxstash-private` repo.

When adding assets for a new app, create a new top-level folder named after the app and follow the existing structure (a favicon set, plus any logos/wordmarks).

## License

Assets in this directory are licensed under [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International](LICENSE) (CC BY-NC-ND 4.0) — they may not be used commercially or redistributed as modified works.
