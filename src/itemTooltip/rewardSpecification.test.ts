import { describe, expect, it } from "vitest";
import { parseRewardSpecification } from "./rewardSpecification.js";

describe("divination reward specifications", () => {
  it("parses Farrul magic jewellery and its two fixed influences", () => {
    expect(parseRewardSpecification([
      [{ text: "Jewellery of Farrul", tone: "magicItem" }],
      [{ text: "Item Level:", tone: "default" }, { text: "100", tone: "normal" }],
      [{ text: "Shaper + Hunter Item", tone: "default" }]
    ])).toEqual({
      name: "Jewellery of Farrul",
      rarity: "magic",
      properties: ["Item Level: 100"],
      implicitModifiers: [],
      influences: ["shaper", "hunter"],
      corrupted: false,
      synthesised: false,
      itemLevel: 100
    });
  });

  it("parses a corrupted Jewel with a named implicit", () => {
    expect(parseRewardSpecification([
      [{ text: "Jewel", tone: "rareItem" }],
      [{ text: "Implicit Modifier:", tone: "enchanted" }],
      [{ text: "Corrupted Blood cannot be inflicted on you", tone: "magicItem" }],
      [{ text: "Corrupted", tone: "corrupted" }]
    ])).toMatchObject({
      name: "Jewel",
      rarity: "rare",
      implicitModifiers: ["Corrupted Blood cannot be inflicted on you"],
      corrupted: true
    });
  });

  it("retains the generic double-influenced requirement", () => {
    expect(parseRewardSpecification([
      [{ text: "One-Hand Weapon", tone: "rareItem" }],
      [{ text: "Item Level:", tone: "default" }, { text: "100", tone: "normal" }],
      [{ text: "Double-Influenced Item", tone: "default" }]
    ])).toMatchObject({ rarity: "rare", properties: ["Item Level: 100", "Double-Influenced Item"] });
  });
});
