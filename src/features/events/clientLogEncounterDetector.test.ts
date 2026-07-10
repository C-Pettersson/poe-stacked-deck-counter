import { describe, expect, it } from "vitest";
import type { ClientLogEncounter } from "../../shared/types.js";
import { createEncounterDetectorState, detectEncounterLogLine } from "./clientLogEncounterDetector.js";

describe("client log encounter detector", () => {
  it("starts the Shaper from internal and display area lines and completes it on departure", () => {
    const completed: ClientLogEncounter[] = [];
    let state = createEncounterDetectorState();
    const lines = [
      '2026/07/11 19:00:00 1 a [DEBUG Client 1] Generating level 84 area "MapWorldsShapersRealm" with seed 1234',
      "2026/07/11 19:00:02 2 a [INFO Client 1] : You have entered The Shaper's Realm.",
      "2026/07/11 19:05:00 3 a [INFO Client 1] : Savour this moment of victory. There will not be another.",
      '2026/07/11 19:06:00 4 a [DEBUG Client 1] Generating level 60 area "HideoutShrine" with seed 1',
      "2026/07/11 19:06:01 5 a [INFO Client 1] : You have entered Celestial Hideout."
    ];

    lines.forEach((line, index) => {
      state = detectEncounterLogLine(line, index + 1, state, completed);
    });

    expect(state.activeEncounter).toBeNull();
    expect(completed).toHaveLength(1);
    expect(completed[0]).toMatchObject({
      encounterId: "the-shaper",
      areaId: "MapWorldsShapersRealm",
      areaLevel: 84,
      seed: "1234",
      leftToAreaName: "Celestial Hideout",
      completionLine: "Savour this moment of victory. There will not be another."
    });
  });

  it("uses the internal area id to distinguish Uber Elder from Shaper", () => {
    const completed: ClientLogEncounter[] = [];
    let state = createEncounterDetectorState();
    state = detectEncounterLogLine('2026/07/11 20:00:00 1 a [DEBUG Client 1] Generating level 84 area "MapWorldsElderArenaUber" with seed 9', 1, state, completed);
    state = detectEncounterLogLine("2026/07/11 20:00:02 2 a [INFO Client 1] : You have entered The Shaper's Realm.", 2, state, completed);
    expect(state.activeEncounter?.encounterId).toBe("uber-elder");
  });

  it("keeps an encounter open across duplicate entry lines", () => {
    const completed: ClientLogEncounter[] = [];
    let state = createEncounterDetectorState();
    state = detectEncounterLogLine("2026/07/11 20:00:02 1 a [INFO Client 1] : You have entered The Shaper's Realm.", 1, state, completed);
    state = detectEncounterLogLine("2026/07/11 20:02:02 2 a [INFO Client 1] : You have entered The Shaper's Realm.", 2, state, completed);
    expect(completed).toHaveLength(0);
    expect(state.activeEncounter?.startLine).toBe(1);
    expect(state.activeEncounter?.encounterId).toBe("the-shaper");
  });
});
