import { RefreshCw } from "lucide-react";
import type { ReactElement } from "react";
import { CHALLENGE_LEAGUES } from "../../shared/leagues.js";
import type { AppTab, Settings } from "../../shared/types.js";
import { APP_NAVIGATION } from "../appNavigation.js";

export function AppHeader({
  activeTab,
  settings,
  onCurrencyModeChange,
  onPriceLeagueChange,
  onRefreshPrices
}: {
  activeTab: AppTab;
  settings: Settings;
  onCurrencyModeChange: (currencyMode: Settings["currencyMode"]) => void;
  onPriceLeagueChange: (leagueId: string) => void;
  onRefreshPrices: () => void;
}): ReactElement {
  const activeDestination = APP_NAVIGATION.find((item) => item.id === activeTab);

  return (
    <header className="workspace-header">
      <div className="workspace-context">
        <span>Field desk</span>
        <strong>{activeDestination?.label ?? "Research ledger"}</strong>
        <small title={settings.logPath}>Local archive</small>
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
      </div>
    </header>
  );
}
