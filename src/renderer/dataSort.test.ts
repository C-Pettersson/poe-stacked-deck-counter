import { describe, expect, it } from "vitest";
import type { SessionCard } from "../shared/types.js";
import { DEFAULT_DATA_SORT, getNextDataSort, sortDataCards, type DataSortKey } from "./dataSort.js";

describe("sortDataCards", () => {
  const cards = [
    makeCard("Beta", { count: 2, priceChaos: 3, totalChaos: 6, change7d: -5 }),
    makeCard("Alpha", { count: 1, priceChaos: 8, totalChaos: 8, change7d: 4 }),
    makeCard("Gamma", { count: 3, priceChaos: 1, totalChaos: 3, change7d: 2 })
  ];

  it("keeps the default Total descending order", () => {
    expect(names(sortDataCards(cards, 6, DEFAULT_DATA_SORT))).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it.each([
    ["card", ["Alpha", "Beta", "Gamma"], ["Gamma", "Beta", "Alpha"]],
    ["count", ["Alpha", "Beta", "Gamma"], ["Gamma", "Beta", "Alpha"]],
    ["dropRate", ["Alpha", "Beta", "Gamma"], ["Gamma", "Beta", "Alpha"]],
    ["price", ["Gamma", "Beta", "Alpha"], ["Alpha", "Beta", "Gamma"]],
    ["total", ["Gamma", "Beta", "Alpha"], ["Alpha", "Beta", "Gamma"]],
    ["change7d", ["Beta", "Gamma", "Alpha"], ["Alpha", "Gamma", "Beta"]]
  ] satisfies Array<[DataSortKey, string[], string[]]>)("sorts %s ascending and descending", (key, ascending, descending) => {
    expect(names(sortDataCards(cards, 6, { key, direction: "asc" }))).toEqual(ascending);
    expect(names(sortDataCards(cards, 6, { key, direction: "desc" }))).toEqual(descending);
  });

  it.each([
    ["price", "priceChaos"],
    ["total", "totalChaos"],
    ["change7d", "change7d"]
  ] satisfies Array<[DataSortKey, keyof SessionCard]>)("keeps missing %s values at the bottom", (key, property) => {
    const missing = makeCard("Missing", { [property]: null });
    const low = makeCard("Low", { [property]: 1 });
    const high = makeCard("High", { [property]: 9 });
    const rows = [missing, low, high];

    expect(names(sortDataCards(rows, 10, { key, direction: "asc" }))).toEqual(["Low", "High", "Missing"]);
    expect(names(sortDataCards(rows, 10, { key, direction: "desc" }))).toEqual(["High", "Low", "Missing"]);
  });
});

describe("getNextDataSort", () => {
  it("toggles the current sort direction", () => {
    expect(getNextDataSort({ key: "total", direction: "desc" }, "total")).toEqual({
      key: "total",
      direction: "asc"
    });
    expect(getNextDataSort({ key: "total", direction: "asc" }, "total")).toEqual({
      key: "total",
      direction: "desc"
    });
  });

  it("uses column-specific default directions for new sort keys", () => {
    expect(getNextDataSort(DEFAULT_DATA_SORT, "card")).toEqual({ key: "card", direction: "asc" });
    expect(getNextDataSort({ key: "card", direction: "asc" }, "count")).toEqual({
      key: "count",
      direction: "desc"
    });
  });
});

function makeCard(name: string, overrides: Partial<SessionCard> = {}): SessionCard {
  return {
    name,
    count: 1,
    priceChaos: 1,
    totalChaos: 1,
    change7d: 1,
    ...overrides
  };
}

function names(cards: SessionCard[]): string[] {
  return cards.map((card) => card.name);
}
