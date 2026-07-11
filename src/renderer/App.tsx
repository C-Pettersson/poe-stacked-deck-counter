import type { ReactElement } from "react";
import { useFieldNotesApp } from "./app/useFieldNotesApp.js";
import { AppHeader } from "./components/AppHeader.js";
import { AppSidebar } from "./components/AppSidebar.js";
import { ScanProgressBar } from "./components/ScanProgressBar.js";
import { CollectTab } from "./tabs/CollectTab.js";
import { InsightsTab } from "./tabs/InsightsTab.js";
import { RunsTab } from "./tabs/RunsTab.js";
import { SettingsTab } from "./tabs/SettingsTab.js";

export function App(): ReactElement {
  const app = useFieldNotesApp();
  const deck = app.deck;

  if (!deck.settings) {
    return <div className="boot">Opening field notes...</div>;
  }

  return (
    <main className="app-shell">
      <AppSidebar
        activeTab={app.activeTab}
        isScanning={deck.isScanning}
        onScanLog={() => void deck.scanLog()}
        onTabChange={app.setActiveTab}
      />

      <section className="workspace-shell">
        <AppHeader
          activeTab={app.activeTab}
          settings={deck.settings}
          onCurrencyModeChange={(currencyMode) => void deck.changeCurrencyMode(currencyMode)}
          onPriceLeagueChange={(leagueId) => void deck.changePriceLeague(leagueId)}
          onRefreshPrices={deck.refreshSelectedPrices}
        />

        <div className="workspace-page">

      {deck.isScanning ? <ScanProgressBar progress={deck.scanProgress} /> : null}

      {deck.activeEncounter ? (
        <div className="active-encounter-strip" role="status">
          <span className="active-encounter-pulse" aria-hidden="true" />
          <strong>Tracking {deck.activeEncounter.title}</strong>
          <span>{deck.activeEncounter.areaName} · drop entry will open when you leave the encounter.</span>
        </div>
      ) : null}

      {app.activeTab === "collect" ? <CollectTab research={app.research} /> : null}

      {app.activeTab === "runs" ? (
        <RunsTab deck={deck} research={app.research} onEdit={() => app.setActiveTab("collect")} />
      ) : null}

      {app.activeTab === "insights" ? <InsightsTab deck={deck} /> : null}

      {app.activeTab === "settings" ? (
        <SettingsTab
          appInfo={deck.appInfo}
          appUpdateInfo={deck.appUpdateInfo}
          appUpdateStatus={deck.appUpdateStatus}
          isClearingPriceCache={deck.isClearingPriceCache}
          isCheckingForUpdate={deck.isCheckingForUpdate}
          settings={deck.settings}
          priceSnapshots={deck.priceSnapshots}
          onCheckForUpdate={() => void deck.checkForAppUpdate()}
          onClearPriceCache={() => void deck.clearPriceCache()}
          onChooseLog={() => void deck.chooseLogFile()}
          onOpen={deck.openExternal}
          onAutoScanChange={(autoScanEnabled) => void deck.changeAutoScanEnabled(autoScanEnabled)}
          onEncounterNotificationsChange={(encounterNotifications) =>
            void deck.changeEncounterNotifications(encounterNotifications)
          }
          onFixedStackedDeckPriceChange={(fixedStackedDeckPriceChaos) =>
            void deck.changeFixedStackedDeckPrice(fixedStackedDeckPriceChaos)
          }
          onPriceSourceModeChange={(priceSourceMode) => void deck.changePriceSourceMode(priceSourceMode)}
          onPriceSourcePriorityChange={(priceSourcePriority) => void deck.changePriceSourcePriority(priceSourcePriority)}
          onProfitFiltersChange={(profitFilters) => void deck.changeProfitFilters(profitFilters)}
        />
      ) : null}
        </div>
      </section>
    </main>
  );
}
