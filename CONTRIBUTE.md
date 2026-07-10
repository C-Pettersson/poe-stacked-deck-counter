# Contributing to Wraeclast Field Notes

Thanks for helping improve the local field-research companion for the poe.how Codex.

## Project boundaries

Keep this public application independent from proprietary poe.how implementation code. Public metadata may be consumed through documented tRPC procedures, but do not import poe.how's `AppRouter`, Prisma types, services, or source files. Pricing must come directly from poe.watch or poe.ninja and remain locally cached.

Good contributions include:

- Generic collection-run commands, queries, repositories, and UI.
- Passive `Client.txt` detectors and deterministic observation projectors.
- Manual collection workflows and future local adapters where terms permit.
- Runtime validation, privacy hardening, migrations, tests, documentation, and packaging.
- Locally cached provider pricing with provenance and unresolved-item handling.

Out of scope are gameplay automation, client injection, process-memory or packet inspection, input or chat generation, account credentials, telemetry, protected poe.how procedures, and raw-log uploads.

## Architecture rules

- Keep pure models under `src/domain` and use cases under `src/application`.
- Put Electron, SQLite, tRPC, settings, log, and market-provider adapters under `src/main`.
- Keep `src/preload` namespaced and small. Every IPC boundary needs runtime validation and bounded input.
- Keep renderer state feature-scoped. The stacked-deck feature must not become the core run model.
- Preserve template snapshots and item provenance so old research stays understandable after catalog changes.
- Never include local paths, raw evidence, or valuations in a Codex draft.

## Local development

```bash
npm install
npm run dev
```

Before opening a pull request:

```bash
npm test
npm run typecheck
npm run build
```

Run `npm run dist` when touching Electron, icons, preload behavior, updates, or packaging. Use fixtures and mocked fetches instead of live network dependencies in tests.

Use Conventional Commit messages such as:

```text
feat(collect): add manual reward entry
fix(migration): preserve stale provider cache
docs: explain public integration boundary
```

Bug reports should include the app version, operating system, league when relevant, expected and observed behavior, and only the smallest redacted log excerpt needed to reproduce a parser issue. Never post credentials, account data, unredacted paths, or complete logs.
