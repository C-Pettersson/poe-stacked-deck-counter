import { describe, expect, it } from "vitest";
import { projectClientLogEncounter } from "./encounterProjector.js";
import { collectionRunSchema } from "../../main/ipcValidation.js";

describe("projectClientLogEncounter", () => {
  it("creates a deterministic drop-entry draft with Shaper reward choices", () => {
    const run = projectClientLogEncounter({
      id: "encounter:the-shaper:2:2026-07-11T17:00:02.000Z",
      encounterId: "the-shaper",
      title: "The Shaper",
      boss: "The Shaper",
      areaName: "The Shaper's Realm",
      startedAt: "2026-07-11T17:00:02.000Z",
      startLine: 2,
      completionAt: "2026-07-11T17:05:00.000Z",
      completionLine: "Savour this moment of victory. There will not be another.",
      endedAt: "2026-07-11T17:06:02.000Z",
      endLine: 5,
      leftToAreaName: "Celestial Hideout"
    }, []);

    expect(run.id).toContain("client-log-encounter:the-shaper");
    expect(run.origin).toBe("detector");
    expect(run.lifecycle).toBe("draft");
    expect(run.durationSeconds).toBe(360);
    expect(run.items.length).toBeGreaterThan(4);
    expect(run.items.every((item) => item.role === "reward" && item.amount === 0)).toBe(true);
    expect(run.template?.wikiUrl).toContain("The_Shaper");
    expect(() => collectionRunSchema.parse(run)).not.toThrow();
  });
});
