import { describe, expect, it } from "vitest";
import { getDivinationCardMetadata } from "./divinationCardMetadata.js";

describe("getDivinationCardMetadata", () => {
  it("returns the in-game details bundled for a card", () => {
    expect(getDivinationCardMetadata("The Journalist")).toEqual({
      name: "The Journalist",
      stackSize: 10,
      rewardLines: [
        [{ text: "Helmet", tone: "rareItem" }],
        [{ text: "Double-Veiled Item", tone: "default" }]
      ],
      flavourText: "A good spy doesn't forget she's gone undercover.",
      dropLevel: "68+"
    });
  });

  it("normalizes names through the shared details ID convention", () => {
    expect(getDivinationCardMetadata("  the journalist ")?.stackSize).toBe(10);
  });
});
