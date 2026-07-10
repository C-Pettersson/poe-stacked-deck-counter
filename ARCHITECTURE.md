# Architecture

Wraeclast Field Notes is a local-first research collector. Stacked decks are one feature adapter rather than the application's data model.

## Dependency direction

```text
renderer features -> application commands/queries -> domain models
Electron IPC     -> infrastructure adapters     -> domain models
feature detectors -> observations -> projectors -> collection runs
```

`src/domain` has no Electron, React, database, or network dependencies. `src/application` expresses run lifecycle and Codex export use cases. Infrastructure under `src/main` adapts SQLite, public poe.how tRPC, `Client.txt`, settings, and direct price providers. The preload and renderer call typed, runtime-validated IPC operations.

## Core records

- `CollectionRun` stores its template snapshot, league and game version, count, duration, notes, lifecycle, origin, and export time.
- `RunItem` records requirement/reward role, stable `detailsId`, amount, provenance, and an optional local override.
- `Observation` records detector identity, event kind, timestamp, source position, normalized payload, and confidence.
- `MarketPriceQuote` records direct provider provenance, value, confidence, source URL, and expiry.

SQLite uses WAL, foreign keys, and versioned transactional migrations in `collector.db`. The collector worker owns scanning and database access. Scan checkpoints are persisted independently from projected runs so deterministic detectors can replay after truncation or replacement.

## Network and trust boundaries

poe.how provides public catalog metadata, not prices. The client uses `createTRPCUntypedClient`, `superjson`, and locally owned Zod schemas. A six-hour last-known-good cache protects collection during outages or incompatible responses. Administrative and permissioned procedures are not consumed.

poe.watch and poe.ninja are the only valuation providers. Normalized datasets are cached for 12 hours. Hybrid mode tries the configured provider first, retains stale data on transient failures, records provenance, and leaves ambiguous items unpriced.

External browser navigation is HTTPS-only and restricted to explicit hosts. Network requests use timeouts and response-size limits. Renderer sandboxing, context isolation, CSP, a narrow preload namespace, and runtime IPC validation limit the Electron attack surface.

## Draft handoff

Codex draft v3 contains a stable template name and revision, league and game version, duration, run count, requirements, rewards, collection source, and redacted evidence counts. It never contains raw logs, local paths, prices, credentials, or account data. poe.how performs visible item/template reconciliation and authenticated submission.

## Identity migration

The canonical data directory is `%APPDATA%/Wraeclast Field Notes`. On first launch, an empty store probes `%APPDATA%/PoE Stacked Deck Counter` and `%APPDATA%/poe-stacked-deck-counter`, copies supported settings/caches, imports legacy draw caches as observations, and records an idempotent marker. The old directory is never deleted or modified, and two populated identities are never merged automatically.
