import { ExternalLink, FolderOpen, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import type { ReactElement } from "react";
import { formatDateTime } from "../../shared/format.js";
import { LEAGUE_SOURCE_URL, getLeagueById } from "../../shared/leagues.js";
import type { AppInfo, AppUpdateInfo, PriceSnapshot, Settings } from "../../shared/types.js";

export function SettingsTab(props: {
  appInfo: AppInfo | null;
  appUpdateInfo: AppUpdateInfo | null;
  appUpdateStatus: string;
  isClearingPriceCache: boolean;
  isCheckingForUpdate: boolean;
  settings: Settings;
  priceSnapshots: Record<string, PriceSnapshot>;
  onCheckForUpdate: () => void;
  onClearPriceCache: () => void;
  onChooseLog: () => void;
  onOpen: (url: string) => void;
  onAutoScanChange: (enabled: boolean) => void;
  onFixedStackedDeckPriceChange: (fixedStackedDeckPriceChaos: Settings["fixedStackedDeckPriceChaos"]) => void;
  onPriceSourceModeChange: (priceSourceMode: Settings["priceSourceMode"]) => void;
  onPriceSourcePriorityChange: (priceSourcePriority: Settings["priceSourcePriority"]) => void;
  onProfitFiltersChange: (profitFilters: Settings["profitFilters"]) => void;
}): ReactElement {
  const selectedLeague = getLeagueById(props.settings.selectedLeagueId);
  const snapshot = props.priceSnapshots[props.settings.selectedLeagueId];
  const filters = props.settings.profitFilters;
  const releasesUrl =
    props.appUpdateInfo?.updateAvailable ? props.appUpdateInfo.releaseUrl : props.appInfo?.releasesUrl ?? null;
  const versionSummary = props.appUpdateInfo
    ? `Current version ${props.appUpdateInfo.currentVersion}; latest release ${props.appUpdateInfo.latestVersion}`
    : props.appInfo
      ? `Current version ${props.appInfo.version}`
      : "Current version unavailable";

  function updateProfitFilters(patch: Partial<Settings["profitFilters"]>): void {
    props.onProfitFiltersChange({
      ...filters,
      ...patch
    });
  }

  return (
    <section className="settings-grid">
      <article className="settings-card">
        <h2>Client Log</h2>
        <p>{props.settings.logPath}</p>
        <button type="button" onClick={props.onChooseLog}>
          <FolderOpen size={17} />
          <span>Select File</span>
        </button>
        <label className="field-shell checkbox-shell">
          <span>Automatic scanning</span>
          <input
            type="checkbox"
            checked={props.settings.autoScanEnabled}
            onChange={(event) => props.onAutoScanChange(event.target.checked)}
          />
        </label>
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
        <h2>Pricing Options</h2>
        <label className="field-shell">
          <span>Price source</span>
          <select
            value={props.settings.priceSourceMode}
            onChange={(event) => props.onPriceSourceModeChange(event.target.value as Settings["priceSourceMode"])}
          >
            <option value="hybrid">Hybrid</option>
            <option value="poe-watch">poe.watch only</option>
            <option value="poe-ninja">poe.ninja only</option>
          </select>
        </label>
        <label className="field-shell">
          <span>Priority source</span>
          <select
            value={props.settings.priceSourcePriority}
            onChange={(event) => props.onPriceSourcePriorityChange(event.target.value as Settings["priceSourcePriority"])}
            disabled={props.settings.priceSourceMode !== "hybrid"}
          >
            <option value="poe-watch">poe.watch</option>
            <option value="poe-ninja">poe.ninja</option>
          </select>
        </label>
        <label className="field-shell">
          <span>Fixed deck price (chaos)</span>
          <input
            min="0"
            placeholder="Price in chaos"
            step="0.1"
            type="number"
            value={props.settings.fixedStackedDeckPriceChaos ?? ""}
            onChange={(event) => props.onFixedStackedDeckPriceChange(parseOptionalChaosInput(event.target.value))}
          />
        </label>
        <label className="field-shell">
          <span>Minimum value per card</span>
          <input
            min="0"
            step="0.1"
            type="number"
            value={filters.minimumCardValueChaos}
            onChange={(event) => updateProfitFilters({ minimumCardValueChaos: parseChaosInput(event.target.value) })}
          />
        </label>
        <label className="field-shell">
          <span>Minimum value per stack</span>
          <input
            min="0"
            step="0.1"
            type="number"
            value={filters.minimumStackValueChaos}
            onChange={(event) => updateProfitFilters({ minimumStackValueChaos: parseChaosInput(event.target.value) })}
          />
        </label>
        <label className="field-shell">
          <span>Price confidence</span>
          <select
            value={filters.confidenceFilter}
            onChange={(event) =>
              updateProfitFilters({ confidenceFilter: event.target.value as Settings["profitFilters"]["confidenceFilter"] })
            }
          >
            <option value="any">Any price</option>
            <option value="exclude-low">Exclude low confidence</option>
            <option value="high-only">High only</option>
            <option value="low-only">Low only</option>
            <option value="unknown-only">Unknown only</option>
          </select>
        </label>
      </article>
      <article className="settings-card">
        <h2>Prices</h2>
        <p>{snapshot ? `${snapshot.leagueName} cache expires ${formatDateTime(snapshot.expiresAt)}` : "No cache loaded"}</p>
        <div className="settings-actions">
          {snapshot ? (
            <button type="button" onClick={() => props.onOpen(snapshot.sourceUrls.cards)}>
              <ExternalLink size={17} />
              <span>{formatSnapshotSource(snapshot)}</span>
            </button>
          ) : null}
          <button
            aria-busy={props.isClearingPriceCache}
            type="button"
            onClick={props.onClearPriceCache}
            disabled={props.isClearingPriceCache}
          >
            {props.isClearingPriceCache ? (
              <LoaderCircle aria-hidden="true" className="spin-icon" size={17} />
            ) : (
              <Trash2 size={17} />
            )}
            <span>{props.isClearingPriceCache ? "Clearing..." : "Clear Cache"}</span>
          </button>
        </div>
      </article>
      <article className="settings-card">
        <h2>App Updates</h2>
        <p>{versionSummary}</p>
        <p className={props.appUpdateInfo?.updateAvailable ? "update-status available" : "update-status"}>
          {props.appUpdateStatus}
        </p>
        <div className="settings-actions">
          <button
            aria-busy={props.isCheckingForUpdate}
            type="button"
            onClick={props.onCheckForUpdate}
            disabled={props.isCheckingForUpdate}
          >
            {props.isCheckingForUpdate ? (
              <LoaderCircle aria-hidden="true" className="spin-icon" size={17} />
            ) : (
              <RefreshCw size={17} />
            )}
            <span>{props.isCheckingForUpdate ? "Checking..." : "Check for Updates"}</span>
          </button>
          {releasesUrl ? (
            <button type="button" onClick={() => props.onOpen(releasesUrl)}>
              <ExternalLink size={17} />
              <span>{props.appUpdateInfo?.updateAvailable ? "Open Release" : "Releases"}</span>
            </button>
          ) : null}
        </div>
      </article>
    </section>
  );
}

function formatSnapshotSource(snapshot: PriceSnapshot): string {
  if (snapshot.priceSourceMode === "hybrid") {
    return `Hybrid: ${formatPriceSource(snapshot.priceSourcePriority)}`;
  }

  return formatPriceSource(snapshot.priceSourceMode);
}

function formatPriceSource(source: "poe-watch" | "poe-ninja"): string {
  return source === "poe-watch" ? "poe.watch" : "poe.ninja";
}

function parseChaosInput(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parseOptionalChaosInput(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
