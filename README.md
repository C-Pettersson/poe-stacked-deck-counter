# PoE Stacked Deck Counter

Electron and TypeScript app for scanning Path of Exile `Client.txt`, grouping stacked deck openings into sessions, pricing the cards with poe.watch and poe.ninja, and exporting share text or poe.how draft JSON.

## Features

- Streams `Client.txt` so the log size does not drive memory use.
- Detects `Card drawn from the deck` entries in both single-line and wrapped two-line forms.
- Groups openings into sessions when more than 2 hours pass between draws.
- Maps sessions to Path of Exile challenge leagues from the PoE Wiki league date table, with manual override in the UI.
- Fetches and caches divination card prices and Stacked Deck price from poe.watch, poe.ninja, or hybrid source priority.
- Filters low-value or selected confidence levels out of value and profit calculations.
- Provides Sessions, Data, and Settings tabs with Discord, Reddit, CSV, and poe.how draft sharing.
- Uses release-it with Conventional Commits and GitHub release publishing.

## Path of Exile Terms And Third-Party Software

This project is designed to stay on the passive, read-only side of Path of Exile third-party tooling, but it is not reviewed, endorsed, or approved by Grinding Gear Games. Users are responsible for checking the current [Path of Exile & Path of Exile 2 Terms of Use](https://www.pathofexile.com/legal/terms-of-use-and-privacy-policy) and contacting GGG support if they are unsure whether a tool is acceptable.

What this app does:

- Reads a `Client.txt` path selected by the user and parses already-written `Card drawn from the deck` log entries.
- Fetches pricing data from poe.watch and poe.ninja and caches it locally in the app user-data folder.
- Copies or exports share text only when the user clicks the relevant UI action.

What this app does not do:

- Does not hook into, inject into, modify, or automate the Path of Exile client.
- Does not read Path of Exile process memory, inspect network packets, or access protected game state.
- Does not send keyboard input, mouse input, chat commands, or gameplay actions to Path of Exile.
- Does not connect to GGG servers as a game client, use account credentials, scrape the Path of Exile website, or bypass API limits.
- Does not run timers or background actions that affect gameplay.

Features that would require client interaction, gameplay automation, memory or packet inspection, account authentication, or direct GGG API/website access should be treated as out of scope unless they are checked against the current GGG terms and clarified with GGG support where needed.

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
