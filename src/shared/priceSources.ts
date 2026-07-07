import type { PriceSource, PriceSourceMode, PriceSourceOptions } from "./types.js";

export const DEFAULT_PRICE_SOURCE_MODE: PriceSourceMode = "hybrid";
export const DEFAULT_PRICE_SOURCE_PRIORITY: PriceSource = "poe-watch";

export function normalizePriceSourceMode(value: unknown): PriceSourceMode {
  return value === "hybrid" || value === "poe-watch" || value === "poe-ninja" ? value : DEFAULT_PRICE_SOURCE_MODE;
}

export function normalizePriceSource(value: unknown): PriceSource {
  return value === "poe-watch" || value === "poe-ninja" ? value : DEFAULT_PRICE_SOURCE_PRIORITY;
}

export function normalizePriceSourceOptions(value: unknown): PriceSourceOptions {
  const saved = isRecord(value) ? value : {};

  return {
    mode: normalizePriceSourceMode(saved.mode),
    priority: normalizePriceSource(saved.priority)
  };
}

export function otherPriceSource(source: PriceSource): PriceSource {
  return source === "poe-watch" ? "poe-ninja" : "poe-watch";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
