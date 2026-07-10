# Wraeclast Field Notes

**Field research for the poe.how Codex.**

Wraeclast Field Notes is an open-source, local-first desktop tool for recording Path of Exile strategy runs. Start from a public [poe.how](https://poe.how/codex) template, record inputs and outcomes, inspect locally cached market values, then hand a redacted draft to poe.how for authenticated review and submission.

Stacked-deck detection remains the first automatic `Client.txt` adapter. It preserves the existing two-hour grouping, filters, league overrides, fixed deck costs, price preferences, exports, and specialized data views.

## What it does

- Searches active public poe.how strategy templates and item metadata through existing tRPC procedures.
- Records manual or detector-assisted collection runs with a versioned template snapshot.
- Keeps runs, observations, scan checkpoints, catalog snapshots, and provider price datasets in local SQLite storage.
- Scans large logs and performs database work in a worker so Electron's main process stays responsive.
- Fetches prices directly from poe.watch and poe.ninja, caches them for 12 hours, and keeps stale quotes during transient outages.
- Exports Codex draft v3 without local paths, raw log lines, account data, or prices.
- Leaves authentication, reconciliation, review, and submission on poe.how.

## Public integration boundary

This repository does not import poe.how router types, Prisma models, services, or proprietary source. It owns its runtime schemas and uses only public metadata procedures:

- `strategies.templates.listActive` and `strategies.templates.byName`
- `strategies.categories.list`
- `items.search`, `items.byDetailsId`, and `items.byDetailsIds`
- `league.list`, `league.current`, and `league.preferred`
- `releaseVersions.list` and `releaseVersions.current`

It intentionally does not call administrative template routes, the contribution dashboard, poe.how valuation routes, or a separate catalog REST endpoint. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the complete boundary.

## Privacy and Path of Exile terms

All collection data stays on the machine unless the user explicitly copies or saves an export. The app does not send raw logs, local paths, credentials, telemetry, or account data anywhere.

This project is designed for passive, read-only observation. It does not inject into or automate Path of Exile, read process memory, inspect packets, send inputs or chat commands, or act as a game client. It is not reviewed, endorsed, or approved by Grinding Gear Games. Users should check the current [Path of Exile terms](https://www.pathofexile.com/legal/terms-of-use-and-privacy-policy) when in doubt.

## Development

```bash
npm install
npm run dev
```

Quality and packaging checks:

```bash
npm test
npm run typecheck
npm run build
npm run dist
```

The Electron preload API is exposed as `window.wraeclastFieldNotes`. Local application data is stored under `%APPDATA%/Wraeclast Field Notes`; the first launch probes legacy Stacked Deck Counter locations without deleting or changing them.

## Release

The planned first generalized release is `1.0.0`. The GitHub repository will be renamed to `C-Pettersson/wraeclast-field-notes` only after migration and updater compatibility are verified. Existing clones can update their remote URL without moving the local workspace directory.

Releases use Conventional Commits and `release-it`; pushed tags trigger the Windows artifact workflow.
