import type { ReactElement } from "react";
import type { PriceSnapshot, Settings } from "../../shared/types.js";
import { CurrencyAmount } from "../CurrencyAmount.js";
import type { SessionSummary } from "../app/sessionSummary.js";
import { Metric } from "./Metric.js";

export function StatusStrip({
  currencyMode,
  notice,
  priceSnapshot,
  priceStatus,
  summary
}: {
  currencyMode: Settings["currencyMode"];
  notice: string | null;
  priceSnapshot?: PriceSnapshot;
  priceStatus: string;
  summary: SessionSummary;
}): ReactElement {
  return (
    <section className="status-strip">
      <Metric label="Sessions" value={summary.sessions.toString()} />
      <Metric label="Cards" value={summary.cards.toString()} />
      <Metric label="Value" value={<CurrencyAmount mode={currencyMode} snapshot={priceSnapshot} valueChaos={summary.value} />} />
      <Metric label="Cost" value={<CurrencyAmount mode={currencyMode} snapshot={priceSnapshot} valueChaos={summary.cost} />} />
      <Metric
        label="Profit"
        value={<CurrencyAmount mode={currencyMode} signed snapshot={priceSnapshot} valueChaos={summary.profit} />}
        tone={summary.profit >= 0 ? "good" : "bad"}
      />
      <div className="status-note">
        <span>{priceStatus}</span>
        {notice ? <strong>{notice}</strong> : null}
      </div>
    </section>
  );
}
