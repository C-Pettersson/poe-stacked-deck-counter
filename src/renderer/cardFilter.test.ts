import { describe, expect, it } from "vitest";
import { filterCardsByIgnoredVisibility, filterCardsBySearch } from "./cardFilter.js";

const cards = [{ name: "The Doctor" }, { name: "The Nurse" }, { name: "Emperor's Luck" }];

describe("filterCardsBySearch", () => {
  it("returns every card for a blank query", () => {
    expect(filterCardsBySearch(cards, "   ")).toBe(cards);
  });

  it("matches cards regardless of casing and extra spacing", () => {
    expect(filterCardsBySearch(cards, "  THE   doc ").map((card) => card.name)).toEqual(["The Doctor"]);
  });

  it("requires every search term to match the same card name", () => {
    expect(filterCardsBySearch(cards, "the nurse").map((card) => card.name)).toEqual(["The Nurse"]);
    expect(filterCardsBySearch(cards, "doctor nurse")).toEqual([]);
  });
});

describe("filterCardsByIgnoredVisibility", () => {
  const cardsWithIgnoredState = [
    { name: "Included", includedValueChaos: 10 },
    { name: "Manual Ignore", exclusionReason: "manual-ignore", includedValueChaos: 0, isValueIgnored: true },
    { name: "Filter Ignore", exclusionReason: "card-value", includedValueChaos: 0 },
    { name: "Missing Price", includedValueChaos: null }
  ];

  it("hides ignored cards by default", () => {
    expect(filterCardsByIgnoredVisibility(cardsWithIgnoredState, false).map((card) => card.name)).toEqual([
      "Included",
      "Missing Price"
    ]);
  });

  it("returns every card when ignored cards are shown", () => {
    expect(filterCardsByIgnoredVisibility(cardsWithIgnoredState, true)).toBe(cardsWithIgnoredState);
  });
});
