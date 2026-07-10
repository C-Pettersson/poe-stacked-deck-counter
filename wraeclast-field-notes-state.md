# Wraeclast Field Notes Implementation State

Source plan: user-approved conversation plan, 2026-07-10.

Status: **In progress** - started 2026-07-10.

## Scope checklist

- [ ] Rebrand the application, assets, package metadata, update identity, and preload bridge.
- [ ] Migrate legacy user data without modifying the old application folder.
- [ ] Introduce generalized run, item, observation, template, and price domain models.
- [ ] Persist runs, observations, checkpoints, catalog snapshots, and price data in SQLite.
- [ ] Move log ingestion and persistence work behind a worker boundary.
- [ ] Consume existing public poe.how tRPC metadata procedures with locally owned validation schemas.
- [ ] Add template-driven collection, generic run history/editing, and retain stacked-deck analysis.
- [ ] Add Codex draft v3 export and compatible poe.how import.
- [ ] Harden Electron, IPC, CSP, network limits, and external navigation.
- [ ] Preserve existing behavior and pass tests, typecheck, build, and packaging verification.
- [ ] Stage the implementation and prepare the breaking-feature release handoff.

## Progress log

- 2026-07-10: State file created. Existing collector and poe.how integration surfaces reviewed against the approved plan.

## Verification

- Baseline before implementation: `npm.cmd test` - 92 tests passed.
- Baseline before implementation: `npm.cmd run typecheck` - passed.

## Notes

- GitHub repository rename, remote mutation, commit, push, and `1.0.0` release remain approval-gated external actions.
- The poe.how repository is outside the collector workspace write root and may require explicit filesystem approval before its importer can be updated.
