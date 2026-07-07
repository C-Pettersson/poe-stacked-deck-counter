import type { ReactElement } from "react";
import { useDeckCounterApp } from "./app/useDeckCounterApp.js";
import { AppHeader } from "./components/AppHeader.js";
import { AppTabs } from "./components/AppTabs.js";
import { ScanProgressBar } from "./components/ScanProgressBar.js";
import { StatusStrip } from "./components/StatusStrip.js";
import { DataTab } from "./tabs/DataTab.js";
import { SessionsTab } from "./tabs/SessionsTab.js";
import { SettingsTab } from "./tabs/SettingsTab.js";

export function App(): ReactElement {
  const app = useDeckCounterApp();

  if (!app.settings) {
    return <div className="boot">Loading</div>;
  }

  return (
    <main className="app-shell">
      <AppHeader
        isScanning={app.isScanning}
        settings={app.settings}
        onCurrencyModeChange={(currencyMode) => void app.changeCurrencyMode(currencyMode)}
        onPriceLeagueChange={(leagueId) => void app.changePriceLeague(leagueId)}
        onRefreshPrices={app.refreshSelectedPrices}
        onScanLog={() => void app.scanLog()}
      />

      <AppTabs activeTab={app.activeTab} onTabChange={app.setActiveTab} />

      <StatusStrip
        currencyMode={app.settings.currencyMode}
        notice={app.notice}
        priceSnapshot={app.selectedPriceSnapshot}
        priceStatus={app.priceStatus}
        summary={app.summary}
      />

      {app.isScanning ? <ScanProgressBar progress={app.scanProgress} /> : null}

      {app.activeTab === "sessions" ? (
        <SessionsTab
          currencyMode={app.settings.currencyMode}
          fallbackCurrencySnapshot={app.selectedPriceSnapshot}
          priceSnapshots={app.priceSnapshots}
          sessions={app.sessions}
          selectedSession={app.selectedSession}
          sessionDeckPriceOverrides={app.settings.sessionDeckPriceOverrides}
          onSelect={app.selectSession}
          onLeagueChange={app.changeSessionLeague}
          onSessionDeckPriceChange={(sessionId, deckPriceChaos) => void app.changeSessionDeckPrice(sessionId, deckPriceChaos)}
          onDiscord={(session) => void app.copyDiscord(session)}
          onReddit={(session) => void app.copyReddit(session)}
          onCopyPoeHow={(session) => void app.copyPoeHow(session)}
          onSavePoeHow={(session) => void app.savePoeHow(session)}
          onSaveCsv={(session) => void app.saveCsv(session)}
          onOpenCardWiki={app.openCardWiki}
          onToggleCardValue={(cardName) => void app.toggleIgnoredCardValue(cardName)}
        />
      ) : null}

      {app.activeTab === "data" ? (
        <DataTab
          currencyMode={app.settings.currencyMode}
          fallbackCurrencySnapshot={app.selectedPriceSnapshot}
          priceSnapshots={app.priceSnapshots}
          sessions={app.sessions}
          selectedSession={app.selectedSession}
          leagueFilterId={app.dataLeagueFilterId}
          onLeagueFilterChange={app.changeDataLeagueFilter}
          onOpenCardWiki={app.openCardWiki}
          onToggleCardValue={(cardName) => void app.toggleIgnoredCardValue(cardName)}
        />
      ) : null}

      {app.activeTab === "settings" ? (
        <SettingsTab
          appInfo={app.appInfo}
          appUpdateInfo={app.appUpdateInfo}
          appUpdateStatus={app.appUpdateStatus}
          isClearingPriceCache={app.isClearingPriceCache}
          isCheckingForUpdate={app.isCheckingForUpdate}
          settings={app.settings}
          priceSnapshots={app.priceSnapshots}
          onCheckForUpdate={() => void app.checkForAppUpdate()}
          onClearPriceCache={() => void app.clearPriceCache()}
          onChooseLog={() => void app.chooseLogFile()}
          onOpen={app.openExternal}
          onAutoScanChange={(autoScanEnabled) => void app.changeAutoScanEnabled(autoScanEnabled)}
          onFixedStackedDeckPriceChange={(fixedStackedDeckPriceChaos) =>
            void app.changeFixedStackedDeckPrice(fixedStackedDeckPriceChaos)
          }
          onPriceSourceModeChange={(priceSourceMode) => void app.changePriceSourceMode(priceSourceMode)}
          onPriceSourcePriorityChange={(priceSourcePriority) => void app.changePriceSourcePriority(priceSourcePriority)}
          onProfitFiltersChange={(profitFilters) => void app.changeProfitFilters(profitFilters)}
        />
      ) : null}
    </main>
  );
}
