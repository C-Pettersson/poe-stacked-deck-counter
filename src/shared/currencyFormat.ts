import type { CurrencyDenomination, CurrencyMode } from "./types.js";

export const DEFAULT_CURRENCY_MODE: CurrencyMode = "auto";
export const DIVINE_DISPLAY_THRESHOLD_CHAOS = 1000;

export interface CurrencyFormatOptions {
  mode: CurrencyMode;
  divineChaosValue?: number | null;
  locale?: string;
}

export interface FormattedCurrencyValue {
  text: string;
  denomination: CurrencyDenomination | null;
  title?: string;
  ariaLabel: string;
  converted: boolean;
}

export function formatCurrencyValue(
  valueChaos: number | null | undefined,
  options: CurrencyFormatOptions
): FormattedCurrencyValue {
  if (valueChaos === null || valueChaos === undefined || Number.isNaN(valueChaos)) {
    return {
      text: "-",
      denomination: null,
      ariaLabel: "No price",
      converted: false
    };
  }

  const divineChaosValue = getValidDivineChaosValue(options.divineChaosValue);
  const shouldUseDivine =
    options.mode === "auto" && divineChaosValue !== null && Math.abs(valueChaos) > DIVINE_DISPLAY_THRESHOLD_CHAOS;

  if (shouldUseDivine) {
    const divineValue = valueChaos / divineChaosValue;
    const title = `${formatChaosAmount(valueChaos, options.locale)} chaos`;
    const text = formatCurrencyAmount(divineValue, options.locale);

    return {
      text,
      denomination: "divine",
      title,
      ariaLabel: `${text} Divine Orb (${title})`,
      converted: true
    };
  }

  const text = formatChaosAmount(valueChaos, options.locale);
  return {
    text,
    denomination: "chaos",
    ariaLabel: `${text} Chaos Orb`,
    converted: false
  };
}

export function formatSignedCurrencyValue(
  valueChaos: number | null | undefined,
  options: CurrencyFormatOptions
): FormattedCurrencyValue {
  const formatted = formatCurrencyValue(valueChaos, options);
  if (valueChaos === null || valueChaos === undefined || Number.isNaN(valueChaos) || valueChaos <= 0) {
    return formatted;
  }

  return {
    ...formatted,
    text: `+${formatted.text}`,
    ariaLabel: `+${formatted.ariaLabel}`
  };
}

export function formatChaosAmount(value: number, locale?: string): string {
  if (Math.abs(value) >= DIVINE_DISPLAY_THRESHOLD_CHAOS) {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1
    }).format(value);
  }

  return formatCurrencyAmount(value, locale);
}

function formatCurrencyAmount(value: number, locale?: string): string {
  const absValue = Math.abs(value);
  const fractionDigits = absValue >= 10 ? 1 : 2;
  const fixed = value.toFixed(fractionDigits).replace(/\.0$/, "");

  if (!locale) {
    return fixed;
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: fixed.includes(".") ? fixed.split(".")[1].length : 0,
    maximumFractionDigits: fractionDigits
  }).format(Number(fixed));
}

function getValidDivineChaosValue(value: number | null | undefined): number | null {
  return value !== null && value !== undefined && Number.isFinite(value) && value > 0 ? value : null;
}
