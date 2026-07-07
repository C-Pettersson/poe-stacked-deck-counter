import { AlertTriangle, Clipboard, Copy, Download, Save, Share2 } from "lucide-react";
import type { ReactElement } from "react";
import { formatDateRange, formatDropRate, formatPercent } from "../../shared/format.js";
import { CHALLENGE_LEAGUES } from "../../shared/leagues.js";
import type { DeckSession, PriceSnapshot, Settings } from "../../shared/types.js";
import { CurrencyAmount } from "../CurrencyAmount.js";
import { getSessionCurrencySnapshot } from "../app/sessionSummary.js";
import { CardIcon } from "../components/CardIcon.js";
import { EmptyState } from "../components/EmptyState.js";
import { Metric } from "../components/Metric.js";

type SessionsTabProps = {
  currencyMode: Settings["currencyMode"];
  fallbackCurrencySnapshot?: PriceSnapshot;
  priceSnapshots: Record<string, PriceSnapshot>;
  sessions: DeckSession[];
  selectedSession: DeckSession | null;
  onSelect: (id: string) => void;
  onLeagueChange: (sessionId: string, leagueId: string) => void;
  onDiscord: (session: DeckSession) => void;
  onReddit: (session: DeckSession) => void;
  onCopyPoeHow: (session: DeckSession) => void;
  onSavePoeHow: (session: DeckSession) => void;
  onSaveCsv: (session: DeckSession) => void;
};

type SessionDetailProps = SessionsTabProps & {
  selectedCurrencySnapshot?: PriceSnapshot;
};

export function SessionsTab(props: SessionsTabProps): ReactElement {
  const selectedCurrencySnapshot = props.selectedSession
    ? getSessionCurrencySnapshot(props.selectedSession, props.priceSnapshots, props.fallbackCurrencySnapshot)
    : props.fallbackCurrencySnapshot;

  return (
    <section className="session-layout">
      <aside className="session-list">
        {props.sessions.length === 0 ? (
          <EmptyState />
        ) : (
          props.sessions.map((session) => {
            const currencySnapshot = getSessionCurrencySnapshot(session, props.priceSnapshots, props.fallbackCurrencySnapshot);

            return (
              <button
                className={props.selectedSession?.id === session.id ? "session-list-item active" : "session-list-item"}
                key={session.id}
                type="button"
                onClick={() => props.onSelect(session.id)}
              >
                <span>{formatDateRange(session.startAt, session.endAt)}</span>
                <strong>{session.totalCards.toLocaleString()} cards</strong>
                <small>
                  {session.leagueName} -{" "}
                  <CurrencyAmount
                    mode={props.currencyMode}
                    signed
                    snapshot={currencySnapshot}
                    valueChaos={session.profitChaos}
                  />
                </small>
              </button>
            );
          })
        )}
      </aside>

      <section className="session-detail">
        {props.selectedSession ? (
          <SessionDetail {...props} selectedCurrencySnapshot={selectedCurrencySnapshot} />
        ) : (
          <EmptyState />
        )}
      </section>
    </section>
  );
}

function SessionDetail(props: SessionDetailProps): ReactElement {
  const { selectedSession } = props;

  if (!selectedSession) {
    return <EmptyState />;
  }

  return (
    <>
      <div className="detail-header">
        <div>
          <h2>{formatDateRange(selectedSession.startAt, selectedSession.endAt)}</h2>
          <p>
            {selectedSession.totalCards.toLocaleString()} cards, {selectedSession.uniqueCards.toLocaleString()} unique
          </p>
        </div>
        <label className="select-shell compact">
          <span>{selectedSession.source === "auto" ? "Auto league" : "Session league"}</span>
          <select value={selectedSession.leagueId} onChange={(event) => props.onLeagueChange(selectedSession.id, event.target.value)}>
            {CHALLENGE_LEAGUES.map((league) => (
              <option value={league.id} key={league.id}>
                {league.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="detail-metrics">
        <Metric
          label="Value"
          value={
            <CurrencyAmount
              mode={props.currencyMode}
              snapshot={props.selectedCurrencySnapshot}
              valueChaos={selectedSession.totalValueChaos}
            />
          }
        />
        <Metric
          label="Deck cost"
          value={
            <CurrencyAmount
              mode={props.currencyMode}
              snapshot={props.selectedCurrencySnapshot}
              valueChaos={selectedSession.stackedDeckCostChaos}
            />
          }
        />
        <Metric
          label="Profit"
          value={
            <CurrencyAmount
              mode={props.currencyMode}
              signed
              snapshot={props.selectedCurrencySnapshot}
              valueChaos={selectedSession.profitChaos}
            />
          }
          tone={selectedSession.profitChaos >= 0 ? "good" : "bad"}
        />
        <Metric label="Priced" value={`${selectedSession.pricedCards}/${selectedSession.uniqueCards}`} />
      </div>

      <div className="share-row">
        <button type="button" onClick={() => props.onDiscord(selectedSession)}>
          <Clipboard size={17} />
          <span>Discord</span>
        </button>
        <button type="button" onClick={() => props.onReddit(selectedSession)}>
          <Share2 size={17} />
          <span>Reddit</span>
        </button>
        <button type="button" onClick={() => props.onCopyPoeHow(selectedSession)}>
          <Copy size={17} />
          <span>poe.how</span>
        </button>
        <button type="button" onClick={() => props.onSavePoeHow(selectedSession)}>
          <Save size={17} />
          <span>Draft</span>
        </button>
        <button type="button" onClick={() => props.onSaveCsv(selectedSession)}>
          <Download size={17} />
          <span>CSV</span>
        </button>
      </div>

      {selectedSession.missingPrices > 0 ? (
        <div className="warning">
          <AlertTriangle size={18} />
          <span>{selectedSession.missingPrices} cards have no price in the selected price league cache.</span>
        </div>
      ) : null}

      <div className="card-grid">
        {selectedSession.cards.map((card) => (
          <article className="div-card" key={card.name}>
            <CardIcon />
            <div>
              <h3>{card.name}</h3>
              <p>{card.count} opened</p>
              <p>Drop rate {formatDropRate(card.count, selectedSession.totalCards)}</p>
            </div>
            <strong>
              <CurrencyAmount mode={props.currencyMode} snapshot={props.selectedCurrencySnapshot} valueChaos={card.totalChaos} />
            </strong>
            <small>
              <CurrencyAmount mode={props.currencyMode} snapshot={props.selectedCurrencySnapshot} valueChaos={card.priceChaos} /> each -{" "}
              {formatPercent(card.change7d)}
              {card.exclusionReason ? <span className="value-filter-note">{getCardExclusionLabel(card.exclusionReason)}</span> : null}
            </small>
          </article>
        ))}
      </div>
    </>
  );
}

function getCardExclusionLabel(reason: NonNullable<DeckSession["cards"][number]["exclusionReason"]>): string {
  switch (reason) {
    case "card-value":
      return "ignored: card value";
    case "stack-value":
      return "ignored: stack value";
    case "confidence":
      return "ignored: no confidence";
  }
}
