import { describe, expect, it } from "vitest";
import { projectStackedDeckRun, projectStackedDeckSessions } from "./sessionProjector.js";

describe("stacked-deck feature projector", () => {
  it("preserves the legacy two-hour grouping and produces generic observations-backed runs", () => {
    const sessions = projectStackedDeckSessions([
      { id: "a", lineNumber: 1, timestamp: "2026-07-10T10:00:00.000Z", cardName: "The Doctor" },
      { id: "b", lineNumber: 2, timestamp: "2026-07-10T11:59:59.000Z", cardName: "The Nurse" },
      { id: "c", lineNumber: 3, timestamp: "2026-07-10T14:00:00.000Z", cardName: "The Hoarder" }
    ], null);

    expect(sessions).toHaveLength(2);
    const run = projectStackedDeckRun(sessions[0], null, new Date("2026-07-10T15:00:00.000Z"));
    expect(run).toMatchObject({ lifecycle: "completed", origin: "detector", runCount: 2 });
    expect(run.observationIds).toEqual(["a", "b"]);
    expect(run.items).toMatchObject([
      { role: "requirement", detailsId: "stacked-deck", amount: 2 },
      { role: "reward", detailsId: "the-doctor", amount: 1 },
      { role: "reward", detailsId: "the-nurse", amount: 1 }
    ]);
  });
});
