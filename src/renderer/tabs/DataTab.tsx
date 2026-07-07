import { ArrowDown, ArrowUp, ChevronsUpDown, Database, ExternalLink, Eye, EyeOff } from "lucide-react";
import { useMemo, useState, type ReactElement } from "react";
import { formatDropRate, formatPercent } from "../../shared/format.js";
import { CHALLENGE_LEAGUES } from "../../shared/leagues.js";
import { rollupCards } from "../../shared/sessions.js";
import type { DeckSession, PriceSnapshot, Settings } from "../../shared/types.js";
import { CurrencyAmount } from "../CurrencyAmount.js";
import {
  ALL_LEAGUES_FILTER_ID,
  SELECTED_SESSION_FILTER_ID,
  countSessionsByLeague,
  createLeagueFilterId,
  getDataFilterSessions,
  getDataFilterTitle,
  type DataLeagueFilterId
} from "../app/dataLeagueFilter.js";
import { getSessionsCurrencySnapshot } from "../app/sessionSummary.js";
import { filterCardsByIgnoredVisibility, filterCardsBySearch } from "../cardFilter.js";
import {
  DEFAULT_DATA_SORT,
  getNextDataSort,
  sortDataCards,
  type DataSortKey,
  type DataSortState
} from "../dataSort.js";

const DATA_TABLE_COLUMNS: Array<{ key: DataSortKey; label: string }> = [
  { key: "card", label: "Card" },
  { key: "count", label: "Count" },
  { key: "dropRate", label: "Drop Rate" },
  { key: "price", label: "Price" },
  { key: "total", label: "Total" },
  { key: "change7d", label: "7d" }
];

export function DataTab({
  currencyMode,
  fallbackCurrencySnapshot,
  priceSnapshots,
  sessions,
  selectedSession,
  leagueFilterId,
  onLeagueFilterChange,
  onOpenCardWiki,
  onToggleCardValue
}: {
  currencyMode: Settings["currencyMode"];
  fallbackCurrencySnapshot?: PriceSnapshot;
  priceSnapshots: Record<string, PriceSnapshot>;
  sessions: DeckSession[];
  selectedSession: DeckSession | null;
  leagueFilterId: DataLeagueFilterId;
  onLeagueFilterChange: (filterId: DataLeagueFilterId) => void;
  onOpenCardWiki: (cardName: string) => void;
  onToggleCardValue: (cardName: string) => void;
}): ReactElement {
  const [dataSort, setDataSort] = useState<DataSortState>(DEFAULT_DATA_SORT);
  const [cardSearch, setCardSearch] = useState("");
  const [showIgnored, setShowIgnored] = useState(false);
  const effectiveFilterId =
    leagueFilterId === SELECTED_SESSION_FILTER_ID && !selectedSession ? ALL_LEAGUES_FILTER_ID : leagueFilterId;
  const leagueCounts = useMemo(() => countSessionsByLeague(sessions), [sessions]);
  const visibleSessions = useMemo(
    () => getDataFilterSessions(sessions, selectedSession, effectiveFilterId),
    [effectiveFilterId, selectedSession, sessions]
  );
  const totalCards = useMemo(
    () => visibleSessions.reduce((total, session) => total + session.totalCards, 0),
    [visibleSessions]
  );
  const currencySnapshot = useMemo(
    () => getSessionsCurrencySnapshot(visibleSessions, priceSnapshots, fallbackCurrencySnapshot),
    [fallbackCurrencySnapshot, priceSnapshots, visibleSessions]
  );
  const sortedCards = useMemo(
    () => sortDataCards(rollupCards(visibleSessions), totalCards, dataSort),
    [dataSort, totalCards, visibleSessions]
  );
  const visibleCards = useMemo(
    () => filterCardsByIgnoredVisibility(sortedCards, showIgnored),
    [showIgnored, sortedCards]
  );
  const cards = useMemo(() => filterCardsBySearch(visibleCards, cardSearch), [cardSearch, visibleCards]);
  const emptyMessage =
    sortedCards.length === 0
      ? "No cards match this filter"
      : visibleCards.length === 0 && !showIgnored
        ? "Only ignored cards are hidden"
        : "No cards match this search";

  return (
    <section className="data-panel">
      <div className="detail-header">
        <div>
          <h2>{getDataFilterTitle(effectiveFilterId)}</h2>
          <p>
            {visibleSessions.length.toLocaleString()} of {sessions.length.toLocaleString()} sessions loaded,{" "}
            {cards.length.toLocaleString()} of {sortedCards.length.toLocaleString()} cards shown
          </p>
        </div>
        <div className="data-actions">
          <label className="field-shell card-search-field">
            <span>Card search</span>
            <input
              aria-label="Search data cards"
              placeholder="Search cards"
              type="search"
              value={cardSearch}
              onChange={(event) => setCardSearch(event.target.value)}
            />
          </label>
          <label className="field-shell checkbox-shell compact-checkbox">
            <span>Show ignored</span>
            <input
              aria-label="Show ignored data cards"
              type="checkbox"
              checked={showIgnored}
              onChange={(event) => setShowIgnored(event.target.checked)}
            />
          </label>
          <label className="select-shell compact">
            <span>League filter</span>
            <select
              value={effectiveFilterId}
              onChange={(event) => onLeagueFilterChange(event.target.value as DataLeagueFilterId)}
            >
              <option value={SELECTED_SESSION_FILTER_ID} disabled={!selectedSession}>
                Selected session
              </option>
              <option value={ALL_LEAGUES_FILTER_ID}>All leagues</option>
              {CHALLENGE_LEAGUES.map((league) => {
                const sessionCount = leagueCounts.get(league.id) ?? 0;
                return (
                  <option value={createLeagueFilterId(league.id)} key={league.id}>
                    {league.name}
                    {sessionCount > 0 ? ` (${sessionCount})` : ""}
                  </option>
                );
              })}
            </select>
          </label>
          <Database size={24} />
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th className="actions-column" scope="col">
                Actions
              </th>
              {DATA_TABLE_COLUMNS.map((column) => (
                <DataSortHeader
                  key={column.key}
                  label={column.label}
                  sort={dataSort}
                  sortKey={column.key}
                  onSort={(key) => setDataSort((current) => getNextDataSort(current, key))}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {cards.length > 0 ? (
              cards.map((card) => {
                const IgnoreIcon = card.isValueIgnored ? Eye : EyeOff;

                return (
                  <tr key={card.name}>
                    <td className="actions-cell">
                      <button
                        aria-label={`Open ${card.name} on PoE Wiki`}
                        className="card-icon-button"
                        title={`Open ${card.name} on PoE Wiki`}
                        type="button"
                        onClick={() => onOpenCardWiki(card.name)}
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button
                        aria-label={card.isValueIgnored ? `Count ${card.name} value` : `Ignore ${card.name} value`}
                        className={card.isValueIgnored ? "card-icon-button active" : "card-icon-button"}
                        title={card.isValueIgnored ? `Count ${card.name} value` : `Ignore ${card.name} value`}
                        type="button"
                        onClick={() => onToggleCardValue(card.name)}
                      >
                        <IgnoreIcon size={14} />
                      </button>
                    </td>
                    <td>
                      <div className="data-card-cell">
                        <div className="data-card-name-row">
                          <span>{card.name}</span>
                        </div>
                      </div>
                    </td>
                    <td>{card.count.toLocaleString()}</td>
                    <td>{formatDropRate(card.count, totalCards)}</td>
                    <td>
                      <CurrencyAmount mode={currencyMode} snapshot={currencySnapshot} valueChaos={card.priceChaos} />
                    </td>
                    <td>
                      <CurrencyAmount mode={currencyMode} snapshot={currencySnapshot} valueChaos={card.totalChaos} />
                      {card.isValueIgnored ? <span className="value-filter-note">ignored by player</span> : null}
                    </td>
                    <td>{formatPercent(card.change7d)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="table-empty" colSpan={7}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DataSortHeader({
  label,
  sort,
  sortKey,
  onSort
}: {
  label: string;
  sort: DataSortState;
  sortKey: DataSortKey;
  onSort: (key: DataSortKey) => void;
}): ReactElement {
  const isActive = sort.key === sortKey;
  const ariaSort: "ascending" | "descending" | "none" = isActive
    ? sort.direction === "asc"
      ? "ascending"
      : "descending"
    : "none";
  const SortIcon = isActive ? (sort.direction === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <th aria-sort={ariaSort} scope="col">
      <button
        className={isActive ? "table-sort-button active" : "table-sort-button"}
        type="button"
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        <SortIcon aria-hidden="true" size={14} />
      </button>
    </th>
  );
}
