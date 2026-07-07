import { FileSearch, LoaderCircle, RefreshCw } from "lucide-react";
import type { ReactElement } from "react";
import { CHALLENGE_LEAGUES } from "../../shared/leagues.js";
import type { Settings } from "../../shared/types.js";
import stackedDeckLogo from "../assets/stacked-deck-logo.png";

export function AppHeader({
  isScanning,
  settings,
  onCurrencyModeChange,
  onPriceLeagueChange,
  onRefreshPrices,
  onScanLog
}: {
  isScanning: boolean;
  settings: Settings;
  onCurrencyModeChange: (currencyMode: Settings["currencyMode"]) => void;
  onPriceLeagueChange: (leagueId: string) => void;
  onRefreshPrices: () => void;
  onScanLog: () => void;
}): ReactElement {
  return (
    <header className="app-header">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">
          <img src={stackedDeckLogo} alt="" />
        </div>
        <div>
          <h1>PoE Stacked Deck Counter</h1>
          <p>{settings.logPath}</p>
        </div>
      </div>
      <div className="header-actions">
        <label className="select-shell currency-select">
          <span>Currency</span>
          <select
            value={settings.currencyMode}
            onChange={(event) => onCurrencyModeChange(event.target.value as Settings["currencyMode"])}
          >
            <option value="auto">Auto</option>
            <option value="chaos">Chaos</option>
          </select>
        </label>
        <label className="select-shell">
          <span>Price league</span>
          <select value={settings.selectedLeagueId} onChange={(event) => onPriceLeagueChange(event.target.value)}>
            {CHALLENGE_LEAGUES.map((league) => (
              <option value={league.id} key={league.id}>
                {league.name}
              </option>
            ))}
          </select>
        </label>
        <button className="icon-button" type="button" onClick={onRefreshPrices}>
          <RefreshCw size={18} />
          <span>Refresh</span>
        </button>
        <button
          aria-busy={isScanning}
          className={isScanning ? "primary-button is-scanning" : "primary-button"}
          type="button"
          onClick={onScanLog}
          disabled={isScanning}
        >
          {isScanning ? <LoaderCircle aria-hidden="true" className="spin-icon" size={18} /> : <FileSearch size={18} />}
          <span>{isScanning ? "Scanning..." : "Scan Log"}</span>
        </button>
      </div>
    </header>
  );
}
