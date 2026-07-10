# PoE 1 Client.txt event detection

Research checked 2026-07-11. The detector is deliberately passive: it reads appended `Client.txt` bytes and never sends input to Path of Exile.

## Evidence from public tools

- [LabCompass](https://github.com/yznpku/LabCompass) documents the stable `You have entered X.` line and uses it for live labyrinth-area tracking.
- [Exile UI](https://github.com/Lailloken/Exile-UI) reads area transitions and NPC dialogue and uses them for campaign, map, and event tracking.
- [PoE Heistress](https://github.com/LawTotem/poe-heistress) starts and ends heist tracking from area transitions and uses rogue dialogue for intermediate milestones. Its documentation also notes missing/suppressed dialogue for some cases.
- [Exile Diary](https://github.com/Qt-dev/exile-diary) and [TraXile](https://github.com/dermow/TraXile) are prior art for turning local log transitions into map-run records.
- [PoE1ToastNotifier](https://github.com/annedobalina/PoE1ToastNotifier) shows the broader pattern of registering notifications for strings that appear in `Client.txt`.

The resulting reliability order is:

1. `Generating level <level> area "<internal id>" with seed <seed>` supplies the unlocalized internal area identity.
2. `You have entered <display name>.` confirms the transition and supplies the user-facing name.
3. NPC dialogue can add encounter-specific evidence, but cannot be required because dialogue may be disabled, interrupted, or suppressed.
4. PoE 1 does not emit a general boss-killed line. Leaving an arena therefore closes the observed visit and asks the player to record drops; it does not claim that the boss died.

## Supported automatic encounters

Area names and internal IDs are sourced from the linked [PoE Wiki](https://www.poewiki.net/) pages. PoEDB is used for boss dialogue and curated drop metadata.

| Event | Display area | Internal area ID |
| --- | --- | --- |
| The Shaper | [The Shaper's Realm](https://www.poewiki.net/wiki/The_Shaper%27s_Realm) | `MapWorldsShapersRealm` |
| Uber Elder | [The Shaper's Realm](https://www.poewiki.net/wiki/The_Shaper%27s_Realm) | `MapWorldsElderArenaUber` |
| The Elder | [Absence of Value and Meaning](https://www.poewiki.net/wiki/Absence_of_Value_and_Meaning) | `MapWorldsElderArena` |
| The Maven | [Absence of Mercy and Empathy](https://www.poewiki.net/wiki/Absence_of_Mercy_and_Empathy) | `MavenBoss` |
| The Searing Exarch | [Absence of Patience and Wisdom](https://www.poewiki.net/wiki/Absence_of_Patience_and_Wisdom) | `MapWorldsPrimordialBoss3` |
| The Eater of Worlds | [Absence of Symmetry and Harmony](https://www.poewiki.net/wiki/Absence_of_Symmetry_and_Harmony) | `MapWorldsPrimordialBoss4` |
| The Infinite Hunger | [Seething Chyme](https://www.poewiki.net/wiki/Seething_Chyme) | `MapWorldsPrimordialBoss1` |
| The Black Star | [Polaric Void](https://www.poewiki.net/wiki/Polaric_Void) | `MapWorldsPrimordialBoss2` |
| Sirus | [Eye of the Storm](https://www.poewiki.net/wiki/Eye_of_the_Storm) | `AtlasExilesBoss5` |
| Maven invitations | [The Maven's Crucible](https://www.poewiki.net/wiki/The_Maven%27s_Crucible) | `MavenHub` |

The internal ID wins when two encounters share a display name, which is how Shaper and Uber Elder are separated. Display-name matching remains as a fallback for older or reduced log samples.

## Shaper-specific enrichment

[PoEDB's Shaper data](https://poedb.tw/us/The_Shaper) provides the known outro dialogue and current normal/Uber unique drop pools. The app treats an outro line as extra completion evidence and preloads a large icon grid for the named unique drops. Zone departure still closes the visit if no dialogue was logged.

## Lifecycle

1. Entering a supported area creates an in-progress detector state in the scan checkpoint.
2. The state survives app restarts and incremental scans.
3. Known dialogue can annotate the active visit.
4. Entering a different area closes the visit.
5. A deterministic local draft is persisted. If the departure happened in the last ten minutes, the Collect tab opens automatically.
6. The player taps item tiles to count drops, adds unlisted items through poe.how item search, and saves the run.

Historical visits found during a full scan are saved without stealing focus. Re-scans are idempotent because run IDs derive from the encounter and its first log line.

## Notifications

Desktop encounter notifications are configured under Settings. The user can:

- disable all encounter notifications;
- independently notify on arena entry, a known completion voice line, and arena exit;
- enable or mute each supported encounter;
- independently allow or suppress sound for every encounter.

The default is an exit notification with sound for every supported encounter except The Shaper, which starts fully muted. The first automatic scan only establishes a baseline, so historical encounters and an encounter already active when the app starts do not produce notification spam. Clicking a native notification restores and focuses the app.

## Extension points

New arena-based events only need a catalog entry containing display names, internal IDs, and reference links. Optional completion dialogue and curated reward items can be added independently. Multi-stage mechanics such as Heist jobs or Labyrinth rooms should use dedicated detectors because their intermediate states are richer than a single enter/leave visit.
