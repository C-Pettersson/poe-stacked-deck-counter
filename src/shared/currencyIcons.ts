import type { CurrencyDenomination, CurrencyPrice, PriceConfidence, PriceSnapshot, PriceSource } from "./types.js";

export interface CurrencyIconInfo {
  denomination: CurrencyDenomination;
  name: string;
  detailsId: string;
  icon: string;
}

export const DEFAULT_CURRENCY_ICONS: Record<CurrencyDenomination, CurrencyIconInfo> = {
  chaos: {
    denomination: "chaos",
    name: "Chaos Orb",
    detailsId: "chaos-orb",
    icon: "https://web.poecdn.com/image/Art/2DItems/Currency/CurrencyRerollRare.png?scale=1&w=1&h=1"
  },
  divine: {
    denomination: "divine",
    name: "Divine Orb",
    detailsId: "divine-orb",
    icon: "https://web.poecdn.com/image/Art/2DItems/Currency/CurrencyModValues.png?scale=1&w=1&h=1"
  }
};

export function resolveCurrencyIcon(
  snapshot: PriceSnapshot | null | undefined,
  denomination: CurrencyDenomination
): CurrencyIconInfo {
  const fallback = DEFAULT_CURRENCY_ICONS[denomination];
  const pricedCurrency = snapshot?.currency?.[denomination];

  return {
    ...fallback,
    name: pricedCurrency?.name ?? fallback.name,
    detailsId: pricedCurrency?.detailsId ?? fallback.detailsId,
    icon: pricedCurrency?.icon ?? fallback.icon
  };
}

export function getDivineChaosValue(snapshot: PriceSnapshot | null | undefined): number | null {
  return getValidChaosValue(snapshot?.currency?.divine?.chaosValue);
}

export function createDefaultCurrencyPrice(
  denomination: CurrencyDenomination,
  source: PriceSource = "poe-ninja",
  confidence: PriceConfidence = denomination === "chaos" ? "high" : "unknown"
): CurrencyPrice {
  const icon = DEFAULT_CURRENCY_ICONS[denomination];
  return {
    id: icon.detailsId,
    name: icon.name,
    detailsId: icon.detailsId,
    chaosValue: denomination === "chaos" ? 1 : 0,
    confidence,
    source,
    icon: icon.icon
  };
}

function getValidChaosValue(value: number | null | undefined): number | null {
  return value !== null && value !== undefined && Number.isFinite(value) && value > 0 ? value : null;
}
