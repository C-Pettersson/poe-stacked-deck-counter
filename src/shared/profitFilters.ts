import type { CardPrice, ConfidenceFilter, PriceConfidence, ProfitFilters, SessionCard, SessionCardExclusionReason } from "./types.js";

export const DEFAULT_PROFIT_FILTERS: ProfitFilters = {
  minimumCardValueChaos: 0,
  minimumStackValueChaos: 0,
  confidenceFilter: "any"
};

export function normalizeProfitFilters(value: unknown): ProfitFilters {
  const saved = isRecord(value) ? value : {};

  return {
    minimumCardValueChaos: normalizeThreshold(saved.minimumCardValueChaos),
    minimumStackValueChaos: normalizeThreshold(saved.minimumStackValueChaos),
    confidenceFilter: normalizeConfidenceFilter(saved.confidenceFilter, saved.requireConfidence)
  };
}

export function hasCardPriceConfidence(price: CardPrice): boolean {
  return getCardPriceConfidence(price) === "high";
}

export function getCardPriceConfidence(price: Pick<CardPrice, "confidence" | "hasConfidence">): PriceConfidence {
  if (price.confidence === "high" || price.confidence === "low" || price.confidence === "unknown") {
    return price.confidence;
  }

  if (typeof price.hasConfidence === "boolean") {
    return price.hasConfidence ? "high" : "low";
  }

  return "unknown";
}

export function getIncludedValueChaos(
  card: Pick<SessionCard, "priceChaos" | "totalChaos" | "hasPriceConfidence" | "priceConfidence">,
  filters: ProfitFilters
): { valueChaos: number | null; reason?: SessionCardExclusionReason } {
  if (card.priceChaos === null || card.totalChaos === null) {
    return { valueChaos: null };
  }

  if (!isIncludedByConfidence(card.priceConfidence ?? getLegacyConfidence(card.hasPriceConfidence), filters.confidenceFilter)) {
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

function normalizeConfidenceFilter(value: unknown, legacyRequireConfidence: unknown): ConfidenceFilter {
  if (
    value === "any" ||
    value === "exclude-low" ||
    value === "high-only" ||
    value === "low-only" ||
    value === "unknown-only"
  ) {
    return value;
  }

  return legacyRequireConfidence === true ? "high-only" : DEFAULT_PROFIT_FILTERS.confidenceFilter;
}

function isIncludedByConfidence(confidence: PriceConfidence, filter: ConfidenceFilter): boolean {
  if (filter === "exclude-low") {
    return confidence !== "low";
  }

  if (filter === "high-only") {
    return confidence === "high";
  }

  if (filter === "low-only") {
    return confidence === "low";
  }

  if (filter === "unknown-only") {
    return confidence === "unknown";
  }

  return true;
}

function getLegacyConfidence(hasPriceConfidence: boolean | undefined): PriceConfidence {
  if (typeof hasPriceConfidence !== "boolean") {
    return "unknown";
  }

  return hasPriceConfidence ? "high" : "low";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
