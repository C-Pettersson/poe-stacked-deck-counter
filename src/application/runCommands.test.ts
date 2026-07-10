import { describe, expect, it } from "vitest";
import { addRunItem, completeRun, startRun, updateRunDetails } from "./runCommands.js";
import { createCollectionRun } from "../domain/collection.js";

describe("collection run commands", () => {
  it("tracks a run lifecycle and derives elapsed duration", () => {
    const draft = createCollectionRun(null, { now: new Date("2026-01-01T10:00:00.000Z") });
    const active = startRun(draft, new Date("2026-01-01T10:05:00.000Z"));
    const completed = completeRun(active, new Date("2026-01-01T10:35:00.000Z"));

    expect(active.lifecycle).toBe("active");
    expect(completed.lifecycle).toBe("completed");
    expect(completed.durationSeconds).toBe(1_800);
  });

  it("normalizes invalid edits and combines duplicate manual items", () => {
    const run = createCollectionRun(null);
    const updated = updateRunDetails(run, { title: "  ", runCount: 0 });
    const item = { detailsId: "chaos-orb", name: "Chaos Orb" };
    const withTwo = addRunItem(addRunItem(updated, "reward", item), "reward", item);

    expect(updated.title).toBe("Untitled field study");
    expect(updated.runCount).toBe(1);
    expect(withTwo.items).toHaveLength(1);
    expect(withTwo.items[0].amount).toBe(2);
  });
});
