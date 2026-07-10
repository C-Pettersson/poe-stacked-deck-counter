import type { ReactElement } from "react";
import { useFieldNotesApp } from "./app/useFieldNotesApp.js";
import { AppHeader } from "./components/AppHeader.js";
import { AppTabs } from "./components/AppTabs.js";
import { ScanProgressBar } from "./components/ScanProgressBar.js";
import { StatusStrip } from "./components/StatusStrip.js";
import { CollectTab } from "./tabs/CollectTab.js";
import { DataTab } from "./tabs/DataTab.js";
import { RunsTab } from "./tabs/RunsTab.js";
import { SessionsTab } from "./tabs/SessionsTab.js";
import { SettingsTab } from "./tabs/SettingsTab.js";

export function App(): ReactElement {
  const app = useFieldNotesApp();
  const deck = app.deck;

  if (!deck.settings) {
    return <div className="boot">Opening field notes...</div>;
  }

  return (
    <main className="app-shell">
      <AppHeader
        isScanning={deck.isScanning}
        settings={deck.settings}
        onCurrencyModeChange={(currencyMode) => void deck.changeCurrencyMode(currencyMode)}
        onPriceLeagueChange={(leagueId) => void deck.changePriceLeague(leagueId)}
        onRefreshPrices={deck.refreshSelectedPrices}
        onScanLog={() => void deck.scanLog()}
      />

      <AppTabs activeTab={app.activeTab} onTabChange={app.setActiveTab} />

      {app.activeTab === "deck-runs" || app.activeTab === "deck-data" ? (
        <StatusStrip
          currencyMode={deck.settings.currencyMode}
          notice={deck.notice}
          priceSnapshot={deck.selectedPriceSnapshot}
          priceStatus={deck.priceStatus}
          summary={deck.summary}
        />
      ) : null}

      {deck.isScanning ? <ScanProgressBar progress={deck.scanProgress} /> : null}

      {app.activeTab === "collect" ? <CollectTab research={app.research} /> : null}

      {app.activeTab === "runs" ? (
        <RunsTab research={app.research} onEdit={() => app.setActiveTab("collect")} />
      ) : null}

      {app.activeTab === "deck-runs" ? (
        <SessionsTab
          currencyMode={deck.settings.currencyMode}
          fallbackCurrencySnapshot={deck.selectedPriceSnapshot}
          priceSnapshots={deck.priceSnapshots}
          sessions={deck.sessions}
          selectedSession={deck.selectedSession}
          sessionDeckPriceOverrides={deck.settings.sessionDeckPriceOverrides}
          onSelect={deck.selectSession}
          onLeagueChange={deck.changeSessionLeague}
          onSessionDeckPriceChange={(sessionId, deckPriceChaos) =>
            void deck.changeSessionDeckPrice(sessionId, deckPriceChaos)
          }
          onDiscord={(session) => void deck.copyDiscord(session)}
          onReddit={(session) => void deck.copyReddit(session)}
          onCopyPoeHow={(session) => void deck.copyPoeHow(session)}
          onSavePoeHow={(session) => void deck.savePoeHow(session)}
          onSaveCsv={(session) => void deck.saveCsv(session)}
          onOpenCardWiki={deck.openCardWiki}
          onToggleCardValue={(cardName) => void deck.toggleIgnoredCardValue(cardName)}
        />
      ) : null}

      {app.activeTab === "deck-data" ? (
        <DataTab
          currencyMode={deck.settings.currencyMode}
          fallbackCurrencySnapshot={deck.selectedPriceSnapshot}
          priceSnapshots={deck.priceSnapshots}
          sessions={deck.sessions}
          selectedSession={deck.selectedSession}
          leagueFilterId={deck.dataLeagueFilterId}
          onLeagueFilterChange={deck.changeDataLeagueFilter}
          onOpenCardWiki={deck.openCardWiki}
          onToggleCardValue={(cardName) => void deck.toggleIgnoredCardValue(cardName)}
        />
      ) : null}

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
          onFixedStackedDeckPriceChange={(fixedStackedDeckPriceChaos) =>
            void deck.changeFixedStackedDeckPrice(fixedStackedDeckPriceChaos)
          }
          onPriceSourceModeChange={(priceSourceMode) => void deck.changePriceSourceMode(priceSourceMode)}
          onPriceSourcePriorityChange={(priceSourcePriority) => void deck.changePriceSourcePriority(priceSourcePriority)}
          onProfitFiltersChange={(profitFilters) => void deck.changeProfitFilters(profitFilters)}
        />
      ) : null}
    </main>
  );
}
