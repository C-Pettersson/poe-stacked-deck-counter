import { describe, expect, it } from "vitest";
import { LocalPoeItemDetailsClient } from "./poeItemData.js";

describe("local Path of Exile item details", () => {
  it("assembles the current Lycosidae definition with its base properties", async () => {
    const [item] = await new LocalPoeItemDetailsClient().enrichItems([{
      detailsId: "lycosidae-rawhide-tower-shield",
      name: "Lycosidae",
      baseType: "Rawhide Tower Shield",
      category: "UniqueArmour",
      tags: [{ name: "unique" }]
    }]);

    expect(item.gameData).toMatchObject({
      rarity: "unique",
      properties: ["Chance to Block: (29-31)%", "Armour: (173-226)", "Movement Speed: -3%"],
      requirements: ["Requires Level 11, 33 Str"],
      implicitModifiers: ["+(10-20) to maximum Life"],
      flavourText: "A true predator does not chase; It waits."
    });
    expect(item.gameData?.explicitModifiers).toContain("Adds 250 to 300 Cold Damage to Retaliation Skills");
    expect(item.gameData?.source?.kind).toBe("path-of-building");
  });

  it("preserves catalog corruption and influence qualifiers", async () => {
    const [item] = await new LocalPoeItemDetailsClient().enrichItems([{
      detailsId: "test",
      name: "Lycosidae",
      baseType: "Rawhide Tower Shield",
      tags: [{ name: "corrupted" }, { name: "shaper" }, { name: "hunter" }]
    }]);
    expect(item.gameData).toMatchObject({ corrupted: true, influences: ["shaper", "hunter"] });
  });

  it("loads legacy unique definitions that omit the implicits marker", async () => {
    const [item] = await new LocalPoeItemDetailsClient().enrichItems([{
      detailsId: "crown-of-the-tyrant-magistrate-crown",
      name: "Crown of the Tyrant",
      baseType: "Magistrate Crown",
      category: "UniqueArmour",
      tags: [{ name: "unique" }]
    }]);

    expect(item.gameData).toMatchObject({
      rarity: "unique",
      properties: ["Armour: (160-189)", "Energy Shield: (33-39)"],
      requirements: ["Requires Level 58, 64 Str, 64 Int"],
      explicitModifiers: expect.arrayContaining([
        "Has 1 Socket",
        "+(50-175) to maximum Life",
        "Nearby Enemies have -10% to all Resistances"
      ])
    });
  });
});
