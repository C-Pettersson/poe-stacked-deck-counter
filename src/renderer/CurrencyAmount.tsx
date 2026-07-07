import type { ReactElement } from "react";
import { formatCurrencyValue, formatSignedCurrencyValue } from "../shared/currencyFormat.js";
import { getDivineChaosValue, resolveCurrencyIcon } from "../shared/currencyIcons.js";
import type { CurrencyMode, PriceSnapshot } from "../shared/types.js";

export function CurrencyAmount({
  className,
  mode,
  signed = false,
  snapshot,
  valueChaos
}: {
  className?: string;
  mode: CurrencyMode;
  signed?: boolean;
  snapshot?: PriceSnapshot | null;
  valueChaos: number | null | undefined;
}): ReactElement {
  const formatted = signed
    ? formatSignedCurrencyValue(valueChaos, { mode, divineChaosValue: getDivineChaosValue(snapshot) })
    : formatCurrencyValue(valueChaos, { mode, divineChaosValue: getDivineChaosValue(snapshot) });
  const icon = formatted.denomination ? resolveCurrencyIcon(snapshot, formatted.denomination) : null;
  const classes = ["currency-amount", formatted.denomination ? `currency-${formatted.denomination}` : "placeholder", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span aria-label={formatted.ariaLabel} className={classes} title={formatted.title}>
      <span>{formatted.text}</span>
      {icon ? <img aria-hidden="true" src={icon.icon} alt="" /> : null}
    </span>
  );
}
