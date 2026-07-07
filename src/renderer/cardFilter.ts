import { normalizeCardKey } from "../shared/pricing.js";

type IgnorableCard = {
  exclusionReason?: unknown;
  includedValueChaos?: number | null;
  isValueIgnored?: boolean;
};

export function filterCardsBySearch<T extends { name: string }>(cards: T[], query: string): T[] {
  const terms = normalizeCardSearchQuery(query);

  if (terms.length === 0) {
    return cards;
  }

  return cards.filter((card) => {
    const cardName = normalizeCardKey(card.name);
    return terms.every((term) => cardName.includes(term));
  });
}

export function filterCardsByIgnoredVisibility<T extends IgnorableCard>(cards: T[], showIgnored: boolean): T[] {
  if (showIgnored) {
    return cards;
  }

  return cards.filter((card) => !isIgnoredCard(card));
}

function normalizeCardSearchQuery(query: string): string[] {
  return normalizeCardKey(query).split(" ").filter(Boolean);
}

function isIgnoredCard(card: IgnorableCard): boolean {
  return card.isValueIgnored === true || (card.exclusionReason !== undefined && card.includedValueChaos === 0);
}
