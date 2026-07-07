import { ArrowDown, ArrowUp, ChevronsUpDown, Database } from "lucide-react";
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
  onLeagueFilterChange
}: {
  currencyMode: Settings["currencyMode"];
  fallbackCurrencySnapshot?: PriceSnapshot;
  priceSnapshots: Record<string, PriceSnapshot>;
  sessions: DeckSession[];
  selectedSession: DeckSession | null;
  leagueFilterId: DataLeagueFilterId;
  onLeagueFilterChange: (filterId: DataLeagueFilterId) => void;
}): ReactElement {
  const [dataSort, setDataSort] = useState<DataSortState>(DEFAULT_DATA_SORT);
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
  const cards = useMemo(
    () => sortDataCards(rollupCards(visibleSessions), totalCards, dataSort),
    [dataSort, totalCards, visibleSessions]
  );

  return (
    <section className="data-panel">
      <div className="detail-header">
        <div>
          <h2>{getDataFilterTitle(effectiveFilterId)}</h2>
          <p>
            {visibleSessions.length.toLocaleString()} of {sessions.length.toLocaleString()} sessions loaded
          </p>
        </div>
        <div className="data-actions">
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
              cards.map((card) => (
                <tr key={card.name}>
                  <td>{card.name}</td>
                  <td>{card.count.toLocaleString()}</td>
                  <td>{formatDropRate(card.count, totalCards)}</td>
                  <td>
                    <CurrencyAmount mode={currencyMode} snapshot={currencySnapshot} valueChaos={card.priceChaos} />
                  </td>
                  <td>
                    <CurrencyAmount mode={currencyMode} snapshot={currencySnapshot} valueChaos={card.totalChaos} />
                  </td>
                  <td>{formatPercent(card.change7d)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="table-empty" colSpan={6}>
                  No cards match this filter
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
