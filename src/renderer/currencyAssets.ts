import { resolveCurrencyIcon, type CurrencyIconInfo } from "../shared/currencyIcons.js";
import type { CurrencyDenomination, PriceSnapshot } from "../shared/types.js";
import chaosOrbIcon from "./assets/chaos-orb.png";
import divineOrbIcon from "./assets/divine-orb.png";
import stackedDeckIcon from "./assets/stacked-deck.png";

const BUNDLED_CURRENCY_ICONS: Record<CurrencyDenomination, string> = {
  chaos: chaosOrbIcon,
  divine: divineOrbIcon
};

export const STACKED_DECK_ICON = stackedDeckIcon;

export function resolveBundledCurrencyIcon(
  snapshot: PriceSnapshot | null | undefined,
  denomination: CurrencyDenomination
): CurrencyIconInfo {
  return {
    ...resolveCurrencyIcon(snapshot, denomination),
    icon: BUNDLED_CURRENCY_ICONS[denomination]
  };
}
