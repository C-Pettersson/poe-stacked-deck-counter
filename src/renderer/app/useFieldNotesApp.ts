import { useEffect, useState } from "react";
import type { AppTab } from "../../shared/types.js";
import { useStackedDeckFeature } from "./useStackedDeckFeature.js";
import { useResearchRuns } from "./useResearchRuns.js";

export function useFieldNotesApp() {
  const [activeTab, setActiveTab] = useState<AppTab>("collect");
  const deck = useStackedDeckFeature();
  const research = useResearchRuns(
    deck.appInfo?.version,
    deck.settings
      ? { mode: deck.settings.priceSourceMode, priority: deck.settings.priceSourcePriority }
      : undefined
  );

  useEffect(() => {
    if (!deck.scanRevision || !research.catalog) return;
    void research.syncStackedDeckSessions(deck.sessions);
    // A scan revision is the ingestion boundary; price-only session recalculations do not create runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.scanRevision, research.catalog?.fetchedAt]);

  return {
    activeTab,
    deck,
    research,
    setActiveTab
  };
}
