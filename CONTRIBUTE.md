# Contribute

Thanks for taking the time to improve PoE Stacked Deck Counter. This project is an Electron and TypeScript app for passively reading Path of Exile `Client.txt` logs, grouping stacked deck openings into sessions, and pricing the resulting cards.

## Project Scope

Keep contributions on the passive, read-only side of Path of Exile tooling.

In scope:

- Parsing already-written `Client.txt` log entries.
- Improving session grouping, price display, filtering, exports, and local app UX.
- Fetching and caching public price data from supported price sources.
- Improving tests, docs, packaging, and release automation.

Out of scope unless the current Path of Exile terms have been checked and the behavior is clearly acceptable:

- Hooking into, injecting into, modifying, or automating the Path of Exile client.
- Reading process memory, inspecting packets, or accessing protected game state.
- Sending keyboard input, mouse input, chat commands, or gameplay actions.
- Using account credentials, scraping the Path of Exile website, bypassing API limits, or connecting to GGG services as a game client.

## Local Development

Install dependencies:

```bash
npm install
```

Run the app in development mode:

```bash
npm run dev
```

The app starts a Vite dev server and launches Electron against it.

## Quality Checks

Run the test suite:

```bash
npm test
```

Run the production build:

```bash
npm run build
```

Build distributable artifacts when packaging changes need verification:

```bash
npm run dist
```

## Code Guidelines

- Follow the existing TypeScript, React, and Electron structure.
- Put shared parsing, formatting, pricing, filtering, and export logic under `src/shared` when it does not need renderer or main-process APIs.
- Keep renderer UI code under `src/renderer`, Electron main-process services under `src/main`, and preload bridge code under `src/preload`.
- Prefer focused pure functions for parsing and calculations so they can be covered by Vitest tests.
- Avoid adding live network dependencies to tests. Use fixtures, mocks, or deterministic inputs instead.
- Keep user data local unless the user explicitly exports, copies, or shares it.

## Pull Requests

Before opening a pull request:

- Add or update tests for behavior changes.
- Run `npm test`.
- Run `npm run build`.
- Include screenshots or short screen recordings for visible UI changes.
- Update README documentation when commands, features, limitations, or user-facing behavior change.

Use Conventional Commits for commit messages, for example:

```text
feat: add league filter
fix: handle wrapped card draw log entries
docs: document price cache behavior
```

The changelog and release tags are handled by `release-it` during the release process.

## Reporting Bugs

When reporting a bug, include:

- App version or commit.
- Operating system.
- Path of Exile league, if relevant.
- What you expected to happen.
- What happened instead.
- A small redacted `Client.txt` excerpt if the bug depends on log parsing.

Do not include account credentials, private account details, or unredacted personal paths in public issues.
