import { describe, expect, it } from "vitest";
import { createCollectionRun } from "../domain/collection.js";
import { createCodexDraftV3 } from "./codexDraft.js";

describe("Codex draft v3", () => {
  it("exports stable template identity and redacted evidence without prices or paths", () => {
    const run = createCollectionRun({
      id: 7,
      name: "stacked-deck",
      title: "Stacked Decks",
      description: "Open decks",
      revision: "2026-07-10T12:00:00.000Z",
      categoryId: 2,
      fixedResult: false,
      allowRequirementSubmission: true,
      requirements: [{ item: { detailsId: "stacked-deck", name: "Stacked Deck" }, amount: 100 }],
      rewards: []
    });
    run.origin = "detector";
    run.observationIds = ["draw-1"];
    run.items[0].priceOverrideChaos = 2.5;

    const draft = createCodexDraftV3(run, "1.0.0", new Date("2026-07-10T12:30:00.000Z"));
    const serialized = JSON.stringify(draft);

    expect(draft.schemaVersion).toBe(3);
    expect(draft.run.templateName).toBe("stacked-deck");
    expect(draft.source.collectionSource).toBe("log_file");
    expect(draft.run.evidence).toEqual({ observationCount: 1, detectorAssisted: true });
    expect(serialized).not.toContain("priceOverride");
    expect(serialized).not.toContain("Client.txt");
  });
});
