import { useEffect, useMemo, useState } from "react";
import { createCodexDraftV3, stringifyCodexDraft } from "../../application/codexDraft.js";
import {
  addRunItem,
  archiveRun,
  completeRun,
  removeRunItem,
  resumeRun,
  startRun,
  updateRunDetails,
  updateRunItemAmount
} from "../../application/runCommands.js";
import {
  createCollectionRun,
  touchRun,
  type CatalogItem,
  type CatalogSnapshot,
  type CollectionRun,
  type RunItemRole,
  type TemplateSnapshot
} from "../../domain/collection.js";
import type { MarketPriceQuote } from "../../domain/marketPricing.js";
import type { PriceSourceOptions } from "../../shared/types.js";
import type { DeckSession } from "../../shared/types.js";
import { DEFAULT_PRICE_SOURCE_MODE, DEFAULT_PRICE_SOURCE_PRIORITY } from "../../shared/priceSources.js";
import { projectStackedDeckRun } from "../../features/stackedDeck/sessionProjector.js";

export function useResearchRuns(
  appVersion = "development",
  priceOptions: PriceSourceOptions = { mode: DEFAULT_PRICE_SOURCE_MODE, priority: DEFAULT_PRICE_SOURCE_PRIORITY }
) {
  const [catalog, setCatalog] = useState<CatalogSnapshot | null>(null);
  const [runs, setRuns] = useState<CollectionRun[]>([]);
  const [activeRun, setActiveRun] = useState<CollectionRun | null>(null);
  const [catalogStatus, setCatalogStatus] = useState("Loading poe.how field guide...");
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [itemSearchResults, setItemSearchResults] = useState<CatalogItem[]>([]);
  const [isSearchingItems, setIsSearchingItems] = useState(false);
  const [marketQuotes, setMarketQuotes] = useState<Record<string, MarketPriceQuote>>({});
  const [isPricing, setIsPricing] = useState(false);

  useEffect(() => {
    let current = true;
    setIsLoading(true);

    void Promise.all([window.wraeclastFieldNotes.getCatalog(), window.wraeclastFieldNotes.listRuns()])
      .then(([nextCatalog, nextRuns]) => {
        if (!current) return;
        setCatalog(nextCatalog);
        setRuns(nextRuns);
        setActiveRun(nextRuns.find((run) => run.lifecycle === "active") ?? null);
        setCatalogStatus(
          nextCatalog.fromCache
            ? `Using saved poe.how field guide from ${formatDate(nextCatalog.fetchedAt)}.`
            : `poe.how field guide refreshed ${formatDate(nextCatalog.fetchedAt)}.`
        );
      })
      .catch((error) => {
        if (current) {
          setCatalogStatus(error instanceof Error ? error.message : "Could not load the poe.how field guide.");
        }
      })
      .finally(() => current && setIsLoading(false));

    return () => {
      current = false;
    };
  }, []);

  const currentLeagueId = useMemo(
    () => catalog?.leagues[0]?.id ?? "",
    [catalog]
  );
  const currentGameVersion = useMemo(
    () => catalog?.releaseVersions.find((version) => version.current)?.version ?? "",
    [catalog]
  );

  async function refreshCatalog(): Promise<void> {
    setCatalogStatus("Refreshing poe.how field guide...");
    try {
      const next = await window.wraeclastFieldNotes.getCatalog(true);
      setCatalog(next);
      setCatalogStatus(`poe.how field guide refreshed ${formatDate(next.fetchedAt)}.`);
    } catch (error) {
      setCatalogStatus(error instanceof Error ? error.message : "Catalog refresh failed.");
    }
  }

  function createRun(template: TemplateSnapshot | null): void {
    setActiveRun(
      createCollectionRun(template, {
        leagueId: currentLeagueId,
        gameVersion: currentGameVersion
      })
    );
    setNotice(template ? `Started notes for ${template.title}.` : "Started an unlinked field study.");
  }

  function editRun(changes: Parameters<typeof updateRunDetails>[1]): void {
    setActiveRun((current) => (current ? updateRunDetails(current, changes) : current));
  }

  function beginActiveRun(): void {
    setActiveRun((current) => (current ? startRun(current) : current));
  }

  function finishActiveRun(): void {
    setActiveRun((current) => (current ? completeRun(current) : current));
  }

  function addItem(role: RunItemRole, item: CatalogItem): void {
    setActiveRun((current) => (current ? addRunItem(current, role, item) : current));
  }

  function changeItemAmount(itemId: string, amount: number): void {
    setActiveRun((current) => (current ? updateRunItemAmount(current, itemId, amount) : current));
  }

  function deleteItem(itemId: string): void {
    setActiveRun((current) => (current ? removeRunItem(current, itemId) : current));
  }

  async function saveActiveRun(): Promise<void> {
    if (!activeRun) return;
    try {
      const saved = await window.wraeclastFieldNotes.saveRun(activeRun);
      setActiveRun(saved);
      setRuns((current) => [saved, ...current.filter((run) => run.id !== saved.id)]);
      setNotice("Field notes saved locally.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save field notes.");
    }
  }

  function openRun(run: CollectionRun): void {
    setActiveRun(run.lifecycle === "archived" ? resumeRun(run) : run);
  }

  async function archiveSavedRun(run: CollectionRun): Promise<void> {
    const archived = archiveRun(run);
    await window.wraeclastFieldNotes.saveRun(archived);
    setRuns((current) => current.filter((candidate) => candidate.id !== run.id));
    if (activeRun?.id === run.id) setActiveRun(null);
    setNotice("Field study archived.");
  }

  async function searchItems(query: string): Promise<void> {
    if (query.trim().length < 2) {
      setItemSearchResults([]);
      return;
    }
    setIsSearchingItems(true);
    try {
      setItemSearchResults(await window.wraeclastFieldNotes.searchCatalogItems(query));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Item search failed.");
    } finally {
      setIsSearchingItems(false);
    }
  }

  async function copyDraft(run?: CollectionRun): Promise<void> {
    const target = run ?? activeRun;
    if (!target) return;
    const exported = touchRun(target, { exportedAt: new Date().toISOString() });
    await window.wraeclastFieldNotes.copyText(stringifyCodexDraft(createCodexDraftV3(exported, appVersion)));
    await window.wraeclastFieldNotes.saveRun(exported);
    setActiveRun((current) => (current?.id === exported.id ? exported : current));
    setRuns((current) => [exported, ...current.filter((candidate) => candidate.id !== exported.id)]);
    setNotice("Codex draft v3 copied. Review and submit it on poe.how.");
  }

  async function saveDraft(run?: CollectionRun): Promise<void> {
    const target = run ?? activeRun;
    if (!target) return;
    const content = stringifyCodexDraft(createCodexDraftV3(target, appVersion));
    const path = await window.wraeclastFieldNotes.saveTextFile(`${target.id}-codex-draft-v3.json`, content);
    if (path) setNotice(`Saved ${path}`);
  }

  async function refreshMarketQuotes(forceRefresh = false): Promise<void> {
    if (!activeRun) return;
    const league = catalog?.leagues.find((entry) => entry.id === activeRun.leagueId);
    if (!league) {
      setNotice("Choose a league before refreshing values.");
      return;
    }
    const uniqueItems = [...new Map(activeRun.items.map((item) => [item.detailsId, {
      detailsId: item.detailsId,
      name: item.name,
      icon: item.icon
    }])).values()];
    if (uniqueItems.length === 0) return;

    setIsPricing(true);
    try {
      const quotes = await window.wraeclastFieldNotes.getMarketQuotes({
        leagueName: league.name,
        items: uniqueItems,
        options: priceOptions,
        forceRefresh
      });
      setMarketQuotes(Object.fromEntries(quotes.map((quote) => [quote.detailsId, quote])));
      const unresolved = uniqueItems.length - quotes.length;
      setNotice(
        unresolved > 0
          ? `Values refreshed; ${unresolved} ambiguous or unavailable item${unresolved === 1 ? " remains" : "s remain"} unpriced.`
          : "Values refreshed directly from the selected market providers."
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Market values could not be refreshed.");
    } finally {
      setIsPricing(false);
    }
  }

  async function syncStackedDeckSessions(sessions: DeckSession[]): Promise<void> {
    if (sessions.length === 0) return;
    const knownIds = new Set(runs.map((run) => run.id));
    const template = catalog?.templates.find((entry) => entry.name === "stacked-deck") ?? null;
    const detectedRuns = sessions
      .map((session) => projectStackedDeckRun(session, template))
      .filter((run) => !knownIds.has(run.id));
    if (detectedRuns.length === 0) return;

    try {
      const savedRuns: CollectionRun[] = [];
      for (const run of detectedRuns) {
        savedRuns.push(await window.wraeclastFieldNotes.saveRun(run));
      }
      setRuns((current) => [
        ...savedRuns,
        ...current.filter((run) => !savedRuns.some((saved) => saved.id === run.id))
      ]);
      setNotice(
        `Added ${savedRuns.length} detector-created stacked-deck field ${savedRuns.length === 1 ? "study" : "studies"}.`
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Detected stacked-deck studies could not be saved.");
    }
  }

  return {
    activeRun,
    addItem,
    archiveSavedRun,
    beginActiveRun,
    catalog,
    catalogStatus,
    changeItemAmount,
    copyDraft,
    createRun,
    deleteItem,
    editRun,
    finishActiveRun,
    isLoading,
    isPricing,
    isSearchingItems,
    itemSearchResults,
    marketQuotes,
    notice,
    openRun,
    refreshCatalog,
    refreshMarketQuotes,
    runs,
    saveActiveRun,
    saveDraft,
    searchItems,
    setActiveRun,
    syncStackedDeckSessions
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
