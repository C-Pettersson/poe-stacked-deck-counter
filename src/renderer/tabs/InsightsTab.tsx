import { BarChart3 } from "lucide-react";
import { useState, type ReactElement } from "react";
import type { useStackedDeckFeature } from "../app/useStackedDeckFeature.js";
import { StatusStrip } from "../components/StatusStrip.js";
import { INSIGHT_MODULES, type InsightModule } from "../studyTypes.js";
import { DataTab } from "./DataTab.js";

type StackedDeckFeature = ReturnType<typeof useStackedDeckFeature>;

export function InsightsTab({ deck }: { deck: StackedDeckFeature }): ReactElement {
  const [selectedModuleId, setSelectedModuleId] = useState<InsightModule["id"]>(INSIGHT_MODULES[0].id);
  const selectedModule = INSIGHT_MODULES.find((module) => module.id === selectedModuleId) ?? INSIGHT_MODULES[0];

  if (!deck.settings) return <div className="boot">Opening insights...</div>;

  return (
    <section className="insights-layout">
      <div className="panel insights-heading">
        <div>
          <span className="eyebrow">Research analysis</span>
          <h2>Insights</h2>
          <p>{selectedModule.description}</p>
        </div>
        <label className="field-shell insight-module-select">
          <span>Study type</span>
          <select
            value={selectedModule.id}
            onChange={(event) => setSelectedModuleId(event.target.value as InsightModule["id"])}
          >
            {INSIGHT_MODULES.map((module) => <option value={module.id} key={module.id}>{module.label}</option>)}
          </select>
        </label>
        <BarChart3 size={28} aria-hidden="true" />
      </div>

      {selectedModule.id === "stacked-decks" ? (
        <>
          <StatusStrip
            currencyMode={deck.settings.currencyMode}
            notice={deck.notice}
            priceSnapshot={deck.selectedPriceSnapshot}
            priceStatus={deck.priceStatus}
            summary={deck.summary}
          />
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
        </>
      ) : null}
    </section>
  );
}
