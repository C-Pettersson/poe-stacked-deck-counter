import { AlertTriangle, Clipboard, Copy, Download, ExternalLink, Eye, EyeOff, Save, Share2 } from "lucide-react";
import { useMemo, useState, type ReactElement } from "react";
import { formatDateRange, formatDropRate, formatPercent } from "../../shared/format.js";
import { CHALLENGE_LEAGUES } from "../../shared/leagues.js";
import type { DeckSession, PriceSnapshot, Settings } from "../../shared/types.js";
import { CurrencyAmount } from "../CurrencyAmount.js";
import { getSessionCurrencySnapshot } from "../app/sessionSummary.js";
import { filterCardsByIgnoredVisibility, filterCardsBySearch } from "../cardFilter.js";
import { CardIcon } from "../components/CardIcon.js";
import { EmptyState } from "../components/EmptyState.js";
import { Metric } from "../components/Metric.js";

type SessionsTabProps = {
  currencyMode: Settings["currencyMode"];
  fallbackCurrencySnapshot?: PriceSnapshot;
  priceSnapshots: Record<string, PriceSnapshot>;
  sessions: DeckSession[];
  selectedSession: DeckSession | null;
  sessionDeckPriceOverrides: Record<string, number>;
  onSelect: (id: string) => void;
  onLeagueChange: (sessionId: string, leagueId: string) => void;
  onSessionDeckPriceChange: (sessionId: string, deckPriceChaos: number | null) => void;
  onDiscord: (session: DeckSession) => void;
  onReddit: (session: DeckSession) => void;
  onCopyPoeHow: (session: DeckSession) => void;
  onSavePoeHow: (session: DeckSession) => void;
  onSaveCsv: (session: DeckSession) => void;
  onOpenCardWiki: (cardName: string) => void;
  onToggleCardValue: (cardName: string) => void;
};

type SessionDetailProps = SessionsTabProps & {
  cardSearch: string;
  showIgnored: boolean;
  selectedCurrencySnapshot?: PriceSnapshot;
  onCardSearchChange: (query: string) => void;
  onShowIgnoredChange: (showIgnored: boolean) => void;
};

export function SessionsTab(props: SessionsTabProps): ReactElement {
  const [cardSearch, setCardSearch] = useState("");
  const [showIgnored, setShowIgnored] = useState(false);
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
          <SessionDetail
            {...props}
            cardSearch={cardSearch}
            showIgnored={showIgnored}
            selectedCurrencySnapshot={selectedCurrencySnapshot}
            onCardSearchChange={setCardSearch}
            onShowIgnoredChange={setShowIgnored}
          />
        ) : (
          <EmptyState />
        )}
      </section>
    </section>
  );
}

function SessionDetail(props: SessionDetailProps): ReactElement {
  const { selectedSession } = props;
  const cardsByIgnoredVisibility = useMemo(
    () => (selectedSession ? filterCardsByIgnoredVisibility(selectedSession.cards, props.showIgnored) : []),
    [props.showIgnored, selectedSession]
  );
  const visibleCards = useMemo(
    () => filterCardsBySearch(cardsByIgnoredVisibility, props.cardSearch),
    [cardsByIgnoredVisibility, props.cardSearch]
  );

  if (!selectedSession) {
    return <EmptyState />;
  }

  const cardGridEmptyMessage =
    cardsByIgnoredVisibility.length === 0 && !props.showIgnored
      ? "Only ignored cards are hidden"
      : "No cards match this search";
  const sessionDeckPriceOverride = props.sessionDeckPriceOverrides[selectedSession.id] ?? null;
  const effectiveDeckPriceChaos =
    selectedSession.totalCards > 0 ? selectedSession.stackedDeckCostChaos / selectedSession.totalCards : null;

  return (
    <>
      <div className="detail-header">
        <div>
          <h2>{formatDateRange(selectedSession.startAt, selectedSession.endAt)}</h2>
          <p>
            {selectedSession.totalCards.toLocaleString()} cards, {selectedSession.uniqueCards.toLocaleString()} unique
          </p>
        </div>
        <div className="detail-controls">
          <label className="field-shell compact deck-price-field">
            <span>Deck price</span>
            <input
              min="0"
              placeholder={formatDeckPricePlaceholder(effectiveDeckPriceChaos)}
              step="0.1"
              type="number"
              value={sessionDeckPriceOverride ?? ""}
              onChange={(event) => props.onSessionDeckPriceChange(selectedSession.id, parseOptionalChaosInput(event.target.value))}
            />
          </label>
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

      <div className="card-toolbar">
        <label className="field-shell card-search-field">
          <span>Card search</span>
          <input
            aria-label="Search session cards"
            placeholder="Search cards"
            type="search"
            value={props.cardSearch}
            onChange={(event) => props.onCardSearchChange(event.target.value)}
          />
        </label>
        <label className="field-shell checkbox-shell compact-checkbox">
          <span>Show ignored</span>
          <input
            aria-label="Show ignored session cards"
            type="checkbox"
            checked={props.showIgnored}
            onChange={(event) => props.onShowIgnoredChange(event.target.checked)}
          />
        </label>
      </div>

      <div className="card-grid">
        {visibleCards.length > 0 ? (
          visibleCards.map((card) => {
            const IgnoreIcon = card.isValueIgnored ? Eye : EyeOff;

            return (
              <article className="div-card" key={card.name}>
                <CardIcon />
                <div className="card-body">
                  <div className="card-title-row">
                    <h3>{card.name}</h3>
                    <div className="card-actions">
                      <button
                        aria-label={`Open ${card.name} on PoE Wiki`}
                        className="card-icon-button"
                        title={`Open ${card.name} on PoE Wiki`}
                        type="button"
                        onClick={() => props.onOpenCardWiki(card.name)}
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button
                        aria-label={card.isValueIgnored ? `Count ${card.name} value` : `Ignore ${card.name} value`}
                        className={card.isValueIgnored ? "card-icon-button active" : "card-icon-button"}
                        title={card.isValueIgnored ? `Count ${card.name} value` : `Ignore ${card.name} value`}
                        type="button"
                        onClick={() => props.onToggleCardValue(card.name)}
                      >
                        <IgnoreIcon size={14} />
                      </button>
                    </div>
                  </div>
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
            );
          })
        ) : (
          <div className="card-grid-empty">{cardGridEmptyMessage}</div>
        )}
      </div>
    </>
  );
}

function parseOptionalChaosInput(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatDeckPricePlaceholder(value: number | null): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "Auto";
}

function getCardExclusionLabel(reason: NonNullable<DeckSession["cards"][number]["exclusionReason"]>): string {
  switch (reason) {
    case "card-value":
      return "ignored: card value";
    case "stack-value":
      return "ignored: stack value";
    case "confidence":
      return "ignored: no confidence";
    case "manual-ignore":
      return "ignored by player";
  }
}
