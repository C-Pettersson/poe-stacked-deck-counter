import type { SessionCard } from "../shared/types.js";

export type DataSortKey = "card" | "count" | "dropRate" | "price" | "total" | "change7d";
export type DataSortDirection = "asc" | "desc";

export interface DataSortState {
  key: DataSortKey;
  direction: DataSortDirection;
}

export const DEFAULT_DATA_SORT: DataSortState = {
  key: "total",
  direction: "desc"
};

export function getNextDataSort(current: DataSortState, key: DataSortKey): DataSortState {
  if (current.key === key) {
    return {
      key,
      direction: current.direction === "asc" ? "desc" : "asc"
    };
  }

  return {
    key,
    direction: key === "card" ? "asc" : "desc"
  };
}

export function sortDataCards(cards: SessionCard[], totalCards: number, sort: DataSortState): SessionCard[] {
  return [...cards].sort((a, b) => {
    const compared = compareCards(a, b, totalCards, sort);
    return compared === 0 ? a.name.localeCompare(b.name) : compared;
  });
}

function compareCards(a: SessionCard, b: SessionCard, totalCards: number, sort: DataSortState): number {
  if (sort.key === "card") {
    const compared = a.name.localeCompare(b.name);
    return sort.direction === "asc" ? compared : -compared;
  }

  return compareNullableNumbers(getNumericValue(a, totalCards, sort.key), getNumericValue(b, totalCards, sort.key), sort.direction);
}

function getNumericValue(card: SessionCard, totalCards: number, key: Exclude<DataSortKey, "card">): number | null {
  if (key === "count") {
    return card.count;
  }

  if (key === "dropRate") {
    return totalCards > 0 ? card.count / totalCards : null;
  }

  if (key === "price") {
    return card.priceChaos;
  }

  if (key === "total") {
    return card.totalChaos;
  }

  return card.change7d ?? null;
}

function compareNullableNumbers(
  a: number | null | undefined,
  b: number | null | undefined,
  direction: DataSortDirection
): number {
  const aMissing = a === null || a === undefined || Number.isNaN(a);
  const bMissing = b === null || b === undefined || Number.isNaN(b);

  if (aMissing && bMissing) {
    return 0;
  }

  if (aMissing) {
    return 1;
  }

  if (bMissing) {
    return -1;
  }

  const compared = a - b;
  return direction === "asc" ? compared : -compared;
}
