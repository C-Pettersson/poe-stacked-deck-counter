import type { CardPrice, ProfitFilters, SessionCard, SessionCardExclusionReason } from "./types.js";

export const DEFAULT_PROFIT_FILTERS: ProfitFilters = {
  minimumCardValueChaos: 0,
  minimumStackValueChaos: 0,
  requireConfidence: false
};

export function normalizeProfitFilters(value: unknown): ProfitFilters {
  const saved = isRecord(value) ? value : {};

  return {
    minimumCardValueChaos: normalizeThreshold(saved.minimumCardValueChaos),
    minimumStackValueChaos: normalizeThreshold(saved.minimumStackValueChaos),
    requireConfidence: saved.requireConfidence === true
  };
}

export function hasCardPriceConfidence(price: CardPrice): boolean {
  return price.hasConfidence ?? isFinitePositiveNumber(price.volumeChaosValue);
}

export function getIncludedValueChaos(
  card: Pick<SessionCard, "priceChaos" | "totalChaos" | "hasPriceConfidence">,
  filters: ProfitFilters
): { valueChaos: number | null; reason?: SessionCardExclusionReason } {
  if (card.priceChaos === null || card.totalChaos === null) {
    return { valueChaos: null };
  }

  if (filters.requireConfidence && !card.hasPriceConfidence) {
    return { valueChaos: 0, reason: "confidence" };
  }

  if (filters.minimumCardValueChaos > 0 && card.priceChaos < filters.minimumCardValueChaos) {
    return { valueChaos: 0, reason: "card-value" };
  }

  if (filters.minimumStackValueChaos > 0 && card.totalChaos < filters.minimumStackValueChaos) {
    return { valueChaos: 0, reason: "stack-value" };
  }

  return { valueChaos: card.totalChaos };
}

function normalizeThreshold(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return value;
}

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
