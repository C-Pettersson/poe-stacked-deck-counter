import { describe, expect, it } from "vitest";
import { describeCatalogItemSearchResults, formatCatalogItemMetadata } from "./catalogItemMetadata.js";

describe("catalog item metadata", () => {
  it("makes gem variants distinguishable", () => {
    expect(formatCatalogItemMetadata({
      detailsId: "awakened-enlighten-support-5-20c",
      name: "Awakened Enlighten Support",
      baseType: "Awakened Enlighten Support",
      category: "SkillGem",
      itemType: "SkillGem",
      tags: [
        { name: "gem", hidden: true },
        { name: "level-5", hidden: true },
        { name: "quality-20", hidden: true },
        { name: "corrupted", hidden: true },
        { name: "base:enlighten-support", hidden: true }
      ]
    })).toBe("Level 5 · Quality 20% · Corrupted · Skill Gem");
  });

  it("uses available variant and classification metadata for other item types", () => {
    expect(formatCatalogItemMetadata({
      detailsId: "blighted-beach-map-tier-16",
      name: "Beach Map",
      baseType: "Beach Map",
      itemType: "Map",
      tags: [{ name: "tier-16" }, { name: "blighted" }]
    })).toBe("Tier 16 · Blighted · Map");
  });

  it("falls back to the stable variant id when otherwise identical results remain", () => {
    const results = describeCatalogItemSearchResults([
      {
        detailsId: "foulborn-ventors-gamble-max-shield-gold-ring",
        name: "Foulborn Ventor's Gamble",
        baseType: "Gold Ring",
        itemType: "Ring"
      },
      {
        detailsId: "foulborn-ventors-gamble-max-mana-gold-ring",
        name: "Foulborn Ventor's Gamble",
        baseType: "Gold Ring",
        itemType: "Ring"
      }
    ]);

    expect(results.map((result) => result.metadata)).toEqual([
      "Gold Ring · Ring · Variant ID: foulborn-ventors-gamble-max-shield-gold-ring",
      "Gold Ring · Ring · Variant ID: foulborn-ventors-gamble-max-mana-gold-ring"
    ]);
  });
});
