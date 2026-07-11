# Wraeclast Field Notes Implementation State

Source plan: user-approved conversation plan, 2026-07-10.

Status: **In progress - smoked expedition journal redesign done** - started 2026-07-10.

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

### Smoked expedition journal redesign

- [x] Generate and evaluate three field-journal UI concepts.
- [x] Add a restrained smoked-parchment texture asset.
- [x] Replace the top navigation with a responsive journal-index rail and workspace utility bar.
- [x] Restyle collection, session, data, and settings surfaces as readable ledger pages.
- [x] Verify the redesign at 1320x900 and 1024x720, then stage the scoped changes.

## Progress log

- 2026-07-10: State file created. Existing collector and poe.how integration surfaces reviewed against the approved plan.
- 2026-07-11: Smoked expedition journal redesign started. Existing Collect, Deck Runs, and Settings layouts reviewed before implementation.
- 2026-07-11: Selected the cartographer's field notebook concept after comparing expedition-ledger, survey-notebook, and dossier directions; refined it for lower luminance and a distinct Scan Log action.
- 2026-07-11: Added the responsive leather index rail, workspace utility bar, ledger surface styling, and a 48 KB seamless smoked-parchment WebP texture.
- 2026-07-11: Verified Collect, Runs, Deck Runs, Deck Data, and Settings at desktop and minimum-window sizes; corrected contrast, overflow, and form-layout issues found during the visual pass.

## Verification

- Baseline before implementation: `npm.cmd test` - 92 tests passed.
- Baseline before implementation: `npm.cmd run typecheck` - passed.
- Redesign implementation: `npm.cmd run typecheck` - passed.
- Final redesign verification: `npm.cmd test` - 117 tests passed across 25 files.
- Final redesign verification: `npm.cmd run build` - passed; production bundle includes the 48.37 KB parchment texture.
- Browser verification: all five sections passed at 1320x900 and 1024x720 with no horizontal overflow at minimum width.
- Texture verification: 1024x1024 WebP, 48,368 bytes; opposite-edge mean pixel difference below 1.9 for both axes.

## Notes

- GitHub repository rename, remote mutation, commit, push, and `1.0.0` release remain approval-gated external actions.
- The poe.how repository is outside the collector workspace write root and may require explicit filesystem approval before its importer can be updated.
