# Item tooltip data architecture

The item-tooltip implementation is split into a source-neutral library, generated data, app integration, and React presentation.

## Package boundary

`src/itemTooltip/` is the prospective npm package. Its public exports are in `index.ts`. It contains only TypeScript data models and deterministic functions for:

- unique/base assembly;
- divination-card reward specification parsing;
- influence normalization;
- corruption, synthesis, and other item flags; and
- lookup against normalized generated datasets.

It does not import React, Electron, poe.how, storage, or network code. The Electron adapter is `src/main/services/poeItemData.ts`; renderer components live under `src/renderer/components/`.

## Sources

The generated item data is pinned to Path of Building Community commit `b7c15bc2b451dc0d37f2ce83489159682fdfdb84`. Path of Building provides current PoE 1 base definitions, current/legacy unique variants, display-ready modifier text, spawn tags, and weights.

RePoE was evaluated as a low-level source. Its separation of bases, mods, stats, and stat translations is the right shape for an adapter, but the upstream repository's latest data commit is from 2022 and its README warns that its formats are not final. It is therefore not used as the live authority for current tooltips.

`src/itemTooltip/generated/poe-item-data.json` is the small runtime index. `poe-mod-data.json` contains the full normalized modifier corpus and is deliberately not imported into the normal renderer bundle. A future item-copy parser or crafting view can load it on demand.

Divination-card reward text and local card art are generated separately by `tools/sync-divination-card-art.mjs`. Reward segments are immediately normalized into `RewardSpecification` before presentation.

## Refreshing data

Download or check out the pinned Path of Building source, then run:

```powershell
npm run assets:sync:items -- --pob-root C:\path\to\PathOfBuilding\src\Data
```

The generator emits deterministic JSON containing normalized bases, current unique variants, and modifier definitions. Change the pinned commit in the generator only as part of an intentional data refresh, then run the tooltip tests and visually check the representative fixtures.

## Current assembly guarantees

- A named unique is resolved locally by unique name and base type; Wiki rows cannot silently select the wrong variant.
- Current unique variant tags are selected when Path of Building provides `Variant: Current`.
- Base requirements, implicits, defensive properties, and unique explicit modifiers are composed into one tooltip model.
- Fixed influence pairs such as Shaper + Hunter are represented as two influence IDs and rotate in the renderer.
- Corrupted reward specifications retain their named implicit and corrupted marker.
- Generic outcomes such as `Double-Influenced Item` remain specifications; the UI does not invent two specific influences that are not guaranteed by the reward.

Path of Exile item data and artwork remain property of Grinding Gear Games. Path of Building Community source code is distributed under its own license; generated game records are kept separate from application logic for easier attribution and replacement.
