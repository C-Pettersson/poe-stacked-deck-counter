# PoE Stacked Deck Counter

Electron and TypeScript app for scanning Path of Exile `Client.txt`, grouping stacked deck openings into sessions, pricing the cards with poe.ninja, and exporting share text or poe.how draft JSON.

## Features

- Streams `Client.txt` so the log size does not drive memory use.
- Detects `Card drawn from the deck` entries in both single-line and wrapped two-line forms.
- Groups openings into sessions when more than 2 hours pass between draws.
- Maps sessions to Path of Exile challenge leagues from the PoE Wiki league date table, with manual override in the UI.
- Fetches and caches divination card prices and Stacked Deck price from poe.ninja.
- Provides Sessions, Data, and Settings tabs with Discord, Reddit, CSV, and poe.how draft sharing.
- Uses release-it with Conventional Commits and GitHub release publishing.

## Development

```bash
npm install
npm run dev
```

## Build And Test

```bash
npm test
npm run build
npm run dist
```

## Release

Use Conventional Commits for changes, then run:

```bash
npm run release
```

The tag created by release-it triggers `.github/workflows/release.yml`, which builds the Windows artifacts and publishes them to the GitHub release.
