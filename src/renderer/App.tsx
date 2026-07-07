import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Check,
  ChevronsUpDown,
  Clipboard,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileSearch,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  Share2,
  Table2
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { CHALLENGE_LEAGUES, LEAGUE_SOURCE_URL, getLeagueById } from "../shared/leagues.js";
import {
  formatChaos,
  formatDateRange,
  formatDateTime,
  formatDropRate,
  formatPercent,
  formatSignedChaos
} from "../shared/format.js";
import { buildSessions, rollupCards } from "../shared/sessions.js";
import {
  createCsv,
  createDiscordShare,
  createPoeHowDraft,
  createRedditShare,
  stringifyDraft
} from "../shared/share.js";
import type { AppTab, DeckSession, PriceSnapshot, ScanProgress, ScanResult, Settings } from "../shared/types.js";
import {
  DEFAULT_DATA_SORT,
  getNextDataSort,
  sortDataCards,
  type DataSortKey,
  type DataSortState
} from "./dataSort.js";

const initialProgress: ScanProgress = {
  bytesRead: 0,
  totalBytes: 0,
  linesRead: 0,
  drawsFound: 0
};

const SELECTED_SESSION_FILTER_ID = "selected-session";
const ALL_LEAGUES_FILTER_ID = "all-leagues";

type DataLeagueFilterId =
  | typeof SELECTED_SESSION_FILTER_ID
  | typeof ALL_LEAGUES_FILTER_ID
  | `league:${string}`;

const DATA_TABLE_COLUMNS: Array<{ key: DataSortKey; label: string }> = [
  { key: "card", label: "Card" },
  { key: "count", label: "Count" },
  { key: "dropRate", label: "Drop Rate" },
  { key: "price", label: "Price" },
  { key: "total", label: "Total" },
  { key: "change7d", label: "7d" }
];

export function App(): ReactElement {
  const [activeTab, setActiveTab] = useState<AppTab>("sessions");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgress>(initialProgress);
  const [isScanning, setIsScanning] = useState(false);
  const [priceSnapshots, setPriceSnapshots] = useState<Record<string, PriceSnapshot>>({});
  const [priceStatus, setPriceStatus] = useState("No price cache loaded");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [dataLeagueFilterId, setDataLeagueFilterId] = useState<DataLeagueFilterId>(SELECTED_SESSION_FILTER_ID);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = window.poeDeck.onScanProgress(setScanProgress);
    void window.poeDeck.loadSettings().then((loaded) => {
      setSettings(loaded);
      void loadPrices(loaded.selectedLeagueId, false);
    });

    return unsubscribe;
  }, []);

  const sessions = useMemo(
    () =>
      buildSessions(scanResult?.draws ?? [], priceSnapshots, settings?.sessionLeagueOverrides ?? {}, {
        pricingLeagueId: settings?.selectedLeagueId
      }).sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt)),
    [priceSnapshots, scanResult?.draws, settings?.selectedLeagueId, settings?.sessionLeagueOverrides]
  );

  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? sessions[0] ?? null;
  const summary = useMemo(() => summarizeSessions(sessions), [sessions]);

  useEffect(() => {
    if (!selectedSessionId && sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [selectedSessionId, sessions]);

  async function updateSettings(next: Settings): Promise<void> {
    setSettings(next);
    await window.poeDeck.saveSettings(next);
  }

  async function chooseLogFile(): Promise<void> {
    if (!settings) {
      return;
    }

    const filePath = await window.poeDeck.chooseLogFile();
    if (filePath) {
      await updateSettings({ ...settings, logPath: filePath });
    }
  }

  async function scanLog(): Promise<void> {
    if (!settings) {
      return;
    }

    setIsScanning(true);
    setNotice(null);
    setScanProgress(initialProgress);

    try {
      const result = await window.poeDeck.scanLog(settings.logPath, settings);
      setScanResult(result);
      setSelectedSessionId(null);
      setNotice(`Found ${result.draws.length} card draws in ${result.sessions.length} sessions.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Scan failed.");
    } finally {
      setIsScanning(false);
    }
  }

  async function loadPrices(leagueId: string, forceRefresh: boolean): Promise<void> {
    setPriceStatus(forceRefresh ? "Refreshing prices..." : "Loading prices...");

    try {
      const snapshot = await window.poeDeck.getPrices(leagueId, forceRefresh);
      setPriceSnapshots((current) => ({ ...current, [snapshot.leagueId]: snapshot }));
      setPriceStatus(
        `${snapshot.leagueName} prices ${snapshot.fromCache ? "from cache" : "updated"} at ${formatDateTime(snapshot.fetchedAt)}`
      );
    } catch (error) {
      setPriceStatus(error instanceof Error ? error.message : "Price refresh failed.");
    }
  }

  async function changePriceLeague(leagueId: string): Promise<void> {
    if (!settings) {
      return;
    }

    await updateSettings({ ...settings, selectedLeagueId: leagueId });
    await loadPrices(leagueId, false);
  }

  async function changeSessionLeague(session: DeckSession, leagueId: string): Promise<void> {
    if (!settings) {
      return;
    }

    const nextSettings = {
      ...settings,
      sessionLeagueOverrides: {
        ...settings.sessionLeagueOverrides,
        [session.id]: leagueId
      }
    };
    await updateSettings(nextSettings);
  }

  function changeDataLeagueFilter(filterId: DataLeagueFilterId): void {
    setDataLeagueFilterId(filterId);
  }

  async function copyPayload(payload: { title: string; text: string }): Promise<void> {
    await window.poeDeck.copyText(payload.text);
    setNotice(`${payload.title} copied.`);
  }

  async function copyPoeHow(session: DeckSession): Promise<void> {
    await window.poeDeck.copyText(stringifyDraft(createPoeHowDraft(session)));
    setNotice("poe.how draft copied.");
  }

  async function savePoeHow(session: DeckSession): Promise<void> {
    const saved = await window.poeDeck.saveTextFile(
      `${session.id}-poe-how-draft.json`,
      stringifyDraft(createPoeHowDraft(session))
    );
    if (saved) {
      setNotice(`Saved ${saved}`);
    }
  }

  async function saveCsv(session: DeckSession): Promise<void> {
    const saved = await window.poeDeck.saveTextFile(`${session.id}.csv`, createCsv(session));
    if (saved) {
      setNotice(`Saved ${saved}`);
    }
  }

  if (!settings) {
    return <div className="boot">Loading</div>;
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark">SD</div>
          <div>
            <h1>PoE Stacked Deck Counter</h1>
            <p>{settings.logPath}</p>
          </div>
        </div>
        <div className="header-actions">
          <label className="select-shell">
            <span>Price league</span>
            <select value={settings.selectedLeagueId} onChange={(event) => void changePriceLeague(event.target.value)}>
              {CHALLENGE_LEAGUES.map((league) => (
                <option value={league.id} key={league.id}>
                  {league.name}
                </option>
              ))}
            </select>
          </label>
          <button className="icon-button" type="button" onClick={() => void loadPrices(settings.selectedLeagueId, true)}>
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
          <button
            aria-busy={isScanning}
            className={isScanning ? "primary-button is-scanning" : "primary-button"}
            type="button"
            onClick={() => void scanLog()}
            disabled={isScanning}
          >
            {isScanning ? (
              <LoaderCircle aria-hidden="true" className="spin-icon" size={18} />
            ) : (
              <FileSearch size={18} />
            )}
            <span>{isScanning ? "Scanning..." : "Scan Log"}</span>
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label="Sections">
        <TabButton active={activeTab === "sessions"} icon={<BarChart3 size={18} />} label="Sessions" onClick={() => setActiveTab("sessions")} />
        <TabButton active={activeTab === "data"} icon={<Table2 size={18} />} label="Data" onClick={() => setActiveTab("data")} />
        <TabButton active={activeTab === "settings"} icon={<SettingsIcon size={18} />} label="Settings" onClick={() => setActiveTab("settings")} />
      </nav>

      <section className="status-strip">
        <Metric label="Sessions" value={summary.sessions.toString()} />
        <Metric label="Cards" value={summary.cards.toString()} />
        <Metric label="Value" value={formatChaos(summary.value)} />
        <Metric label="Cost" value={formatChaos(summary.cost)} />
        <Metric label="Profit" value={formatSignedChaos(summary.profit)} tone={summary.profit >= 0 ? "good" : "bad"} />
        <div className="status-note">
          <span>{priceStatus}</span>
          {notice ? <strong>{notice}</strong> : null}
        </div>
      </section>

      {isScanning ? <ScanProgressBar progress={scanProgress} /> : null}

      {activeTab === "sessions" ? (
        <SessionsTab
          sessions={sessions}
          selectedSession={selectedSession}
          onSelect={setSelectedSessionId}
          onLeagueChange={changeSessionLeague}
          onDiscord={(session) => void copyPayload(createDiscordShare(session))}
          onReddit={(session) => void copyPayload(createRedditShare(session))}
          onCopyPoeHow={(session) => void copyPoeHow(session)}
          onSavePoeHow={(session) => void savePoeHow(session)}
          onSaveCsv={(session) => void saveCsv(session)}
        />
      ) : null}

      {activeTab === "data" ? (
        <DataTab
          sessions={sessions}
          selectedSession={selectedSession}
          leagueFilterId={dataLeagueFilterId}
          onLeagueFilterChange={changeDataLeagueFilter}
        />
      ) : null}

      {activeTab === "settings" ? (
        <SettingsTab
          settings={settings}
          priceSnapshots={priceSnapshots}
          onChooseLog={() => void chooseLogFile()}
          onOpen={(url) => void window.poeDeck.openExternal(url)}
        />
      ) : null}
    </main>
  );
}

function TabButton(props: { active: boolean; icon: ReactElement; label: string; onClick: () => void }): ReactElement {
  return (
    <button className={props.active ? "tab-button active" : "tab-button"} type="button" onClick={props.onClick}>
      {props.icon}
      <span>{props.label}</span>
    </button>
  );
}

function Metric(props: { label: string; value: string; tone?: "good" | "bad" }): ReactElement {
  return (
    <div className={`metric ${props.tone ?? ""}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function ScanProgressBar({ progress }: { progress: ScanProgress }): ReactElement {
  const percent = progress.totalBytes > 0 ? Math.min(100, (progress.bytesRead / progress.totalBytes) * 100) : 0;
  const hasMeasuredProgress = progress.totalBytes > 0 && percent > 0;
  const progressLabel = hasMeasuredProgress
    ? `${percent.toFixed(1)}% - ${progress.linesRead.toLocaleString()} lines - ${progress.drawsFound.toLocaleString()} draws`
    : "Scanning log...";

  return (
    <div
      aria-live="polite"
      className={hasMeasuredProgress ? "scan-progress" : "scan-progress is-indeterminate"}
      role="status"
    >
      <div
        aria-hidden="true"
        className="scan-progress-fill"
        style={{ width: hasMeasuredProgress ? `${percent}%` : undefined }}
      />
      <span className="scan-progress-label">{progressLabel}</span>
    </div>
  );
}

function SessionsTab(props: {
  sessions: DeckSession[];
  selectedSession: DeckSession | null;
  onSelect: (id: string) => void;
  onLeagueChange: (session: DeckSession, leagueId: string) => void;
  onDiscord: (session: DeckSession) => void;
  onReddit: (session: DeckSession) => void;
  onCopyPoeHow: (session: DeckSession) => void;
  onSavePoeHow: (session: DeckSession) => void;
  onSaveCsv: (session: DeckSession) => void;
}): ReactElement {
  return (
    <section className="session-layout">
      <aside className="session-list">
        {props.sessions.length === 0 ? (
          <EmptyState />
        ) : (
          props.sessions.map((session) => (
            <button
              className={props.selectedSession?.id === session.id ? "session-list-item active" : "session-list-item"}
              key={session.id}
              type="button"
              onClick={() => props.onSelect(session.id)}
            >
              <span>{formatDateRange(session.startAt, session.endAt)}</span>
              <strong>{session.totalCards.toLocaleString()} cards</strong>
              <small>
                {session.leagueName} - {formatSignedChaos(session.profitChaos)}
              </small>
            </button>
          ))
        )}
      </aside>

      <section className="session-detail">
        {props.selectedSession ? (
          <>
            <div className="detail-header">
              <div>
                <h2>{formatDateRange(props.selectedSession.startAt, props.selectedSession.endAt)}</h2>
                <p>
                  {props.selectedSession.totalCards.toLocaleString()} cards, {props.selectedSession.uniqueCards.toLocaleString()} unique
                </p>
              </div>
              <label className="select-shell compact">
                <span>{props.selectedSession.source === "auto" ? "Auto league" : "Session league"}</span>
                <select
                  value={props.selectedSession.leagueId}
                  onChange={(event) => props.onLeagueChange(props.selectedSession!, event.target.value)}
                >
                  {CHALLENGE_LEAGUES.map((league) => (
                    <option value={league.id} key={league.id}>
                      {league.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="detail-metrics">
              <Metric label="Value" value={formatChaos(props.selectedSession.totalValueChaos)} />
              <Metric label="Deck cost" value={formatChaos(props.selectedSession.stackedDeckCostChaos)} />
              <Metric
                label="Profit"
                value={formatSignedChaos(props.selectedSession.profitChaos)}
                tone={props.selectedSession.profitChaos >= 0 ? "good" : "bad"}
              />
              <Metric label="Priced" value={`${props.selectedSession.pricedCards}/${props.selectedSession.uniqueCards}`} />
            </div>

            <div className="share-row">
              <button type="button" onClick={() => props.onDiscord(props.selectedSession!)}>
                <Clipboard size={17} />
                <span>Discord</span>
              </button>
              <button type="button" onClick={() => props.onReddit(props.selectedSession!)}>
                <Share2 size={17} />
                <span>Reddit</span>
              </button>
              <button type="button" onClick={() => props.onCopyPoeHow(props.selectedSession!)}>
                <Copy size={17} />
                <span>poe.how</span>
              </button>
              <button type="button" onClick={() => props.onSavePoeHow(props.selectedSession!)}>
                <Save size={17} />
                <span>Draft</span>
              </button>
              <button type="button" onClick={() => props.onSaveCsv(props.selectedSession!)}>
                <Download size={17} />
                <span>CSV</span>
              </button>
            </div>

            {props.selectedSession.missingPrices > 0 ? (
              <div className="warning">
                <AlertTriangle size={18} />
                <span>{props.selectedSession.missingPrices} cards have no price in the selected price league cache.</span>
              </div>
            ) : null}

            <div className="card-grid">
              {props.selectedSession.cards.map((card) => (
                <article className="div-card" key={card.name}>
                  <CardIcon icon={card.icon} />
                  <div>
                    <h3>{card.name}</h3>
                    <p>{card.count} opened</p>
                    <p>Drop rate {formatDropRate(card.count, props.selectedSession!.totalCards)}</p>
                  </div>
                  <strong>{formatChaos(card.totalChaos)}</strong>
                  <small>
                    {formatChaos(card.priceChaos)} each - {formatPercent(card.change7d)}
                  </small>
                </article>
              ))}
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </section>
    </section>
  );
}

function CardIcon({ icon }: { icon?: string }): ReactElement {
  const [failedIcon, setFailedIcon] = useState<string | null>(null);
  const showImage = icon && failedIcon !== icon;

  if (showImage) {
    return (
      <div className="card-icon has-image">
        <img src={icon} alt="" onError={() => setFailedIcon(icon)} />
      </div>
    );
  }

  return (
    <div className="card-icon fallback" aria-hidden="true">
      D
    </div>
  );
}

function DataTab({
  sessions,
  selectedSession,
  leagueFilterId,
  onLeagueFilterChange
}: {
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
                  <td>{formatChaos(card.priceChaos)}</td>
                  <td>{formatChaos(card.totalChaos)}</td>
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

function SettingsTab(props: {
  settings: Settings;
  priceSnapshots: Record<string, PriceSnapshot>;
  onChooseLog: () => void;
  onOpen: (url: string) => void;
}): ReactElement {
  const selectedLeague = getLeagueById(props.settings.selectedLeagueId);
  const snapshot = props.priceSnapshots[props.settings.selectedLeagueId];

  return (
    <section className="settings-grid">
      <article className="settings-card">
        <h2>Client Log</h2>
        <p>{props.settings.logPath}</p>
        <button type="button" onClick={props.onChooseLog}>
          <FolderOpen size={17} />
          <span>Select File</span>
        </button>
      </article>
      <article className="settings-card">
        <h2>League Dates</h2>
        <p>
          {selectedLeague.name} {selectedLeague.version}
        </p>
        <button type="button" onClick={() => props.onOpen(LEAGUE_SOURCE_URL)}>
          <ExternalLink size={17} />
          <span>PoE Wiki</span>
        </button>
      </article>
      <article className="settings-card">
        <h2>Prices</h2>
        <p>{snapshot ? `${snapshot.leagueName} cache expires ${formatDateTime(snapshot.expiresAt)}` : "No cache loaded"}</p>
        {snapshot ? (
          <button type="button" onClick={() => props.onOpen(snapshot.sourceUrls.cards)}>
            <ExternalLink size={17} />
            <span>poe.ninja</span>
          </button>
        ) : null}
      </article>
      <article className="settings-card">
        <h2>Release</h2>
        <p>release-it, Conventional Commits, GitHub release workflow</p>
        <div className="check-line">
          <Check size={17} />
          <span>Configured</span>
        </div>
      </article>
    </section>
  );
}

function EmptyState(): ReactElement {
  return (
    <div className="empty-state">
      <FileSearch size={34} />
      <span>No sessions loaded</span>
    </div>
  );
}

function summarizeSessions(sessions: DeckSession[]): { sessions: number; cards: number; value: number; cost: number; profit: number } {
  return sessions.reduce(
    (summary, session) => ({
      sessions: summary.sessions + 1,
      cards: summary.cards + session.totalCards,
      value: summary.value + session.totalValueChaos,
      cost: summary.cost + session.stackedDeckCostChaos,
      profit: summary.profit + session.profitChaos
    }),
    { sessions: 0, cards: 0, value: 0, cost: 0, profit: 0 }
  );
}

function createLeagueFilterId(leagueId: string): DataLeagueFilterId {
  return `league:${leagueId}`;
}

function getLeagueIdFromDataFilter(filterId: DataLeagueFilterId): string | null {
  return filterId.startsWith("league:") ? filterId.slice("league:".length) : null;
}

function getDataFilterSessions(
  sessions: DeckSession[],
  selectedSession: DeckSession | null,
  filterId: DataLeagueFilterId
): DeckSession[] {
  if (filterId === SELECTED_SESSION_FILTER_ID) {
    return selectedSession ? [selectedSession] : sessions;
  }

  const leagueId = getLeagueIdFromDataFilter(filterId);
  if (leagueId) {
    return sessions.filter((session) => session.leagueId === leagueId);
  }

  return sessions;
}

function getDataFilterTitle(filterId: DataLeagueFilterId): string {
  if (filterId === SELECTED_SESSION_FILTER_ID) {
    return "Selected Session";
  }

  const leagueId = getLeagueIdFromDataFilter(filterId);
  return leagueId ? `${getLeagueById(leagueId).name} League` : "All Leagues";
}

function countSessionsByLeague(sessions: DeckSession[]): Map<string, number> {
  return sessions.reduce((counts, session) => {
    counts.set(session.leagueId, (counts.get(session.leagueId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}
