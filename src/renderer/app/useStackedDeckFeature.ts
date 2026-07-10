import { useEffect, useMemo, useRef, useState } from "react";
import { getCardWikiUrl } from "../../shared/cardMetadata.js";
import { formatDateTime } from "../../shared/format.js";
import { normalizeCardKey } from "../../shared/pricing.js";
import { updateSessionLeagueOverrides } from "../../shared/sessions.js";
import { projectStackedDeckSessions } from "../../features/stackedDeck/sessionProjector.js";
import {
  createCsv,
  createDiscordShare,
  createPoeHowDraft,
  createRedditShare,
  stringifyDraft
} from "../../shared/share.js";
import type {
  AppInfo,
  AppUpdateInfo,
  DeckSession,
  PriceSnapshot,
  ScanProgress,
  ScanResult,
  Settings
} from "../../shared/types.js";
import { resolveSelectedSession, resolveSelectedSessionId } from "../sessionSelection.js";
import { SELECTED_SESSION_FILTER_ID, type DataLeagueFilterId } from "./dataLeagueFilter.js";
import { createScanNotice } from "./scanNotice.js";
import { summarizeSessions } from "./sessionSummary.js";

const initialProgress: ScanProgress = {
  bytesRead: 0,
  totalBytes: 0,
  linesRead: 0,
  drawsFound: 0
};

export function useStackedDeckFeature() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgress>(initialProgress);
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
  const [isClearingPriceCache, setIsClearingPriceCache] = useState(false);
  const [priceSnapshots, setPriceSnapshots] = useState<Record<string, PriceSnapshot>>({});
  const [priceStatus, setPriceStatus] = useState("No price cache loaded");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [dataLeagueFilterId, setDataLeagueFilterId] = useState<DataLeagueFilterId>(SELECTED_SESSION_FILTER_ID);
  const [notice, setNotice] = useState<string | null>(null);
  const [appUpdateInfo, setAppUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [appUpdateStatus, setAppUpdateStatus] = useState("Update status has not been checked.");
  const scanResultVersionRef = useRef(0);

  useEffect(() => {
    const unsubscribe = window.wraeclastFieldNotes.onScanProgress(setScanProgress);
    const unsubscribeAutoScanResult = window.wraeclastFieldNotes.onAutoScanResult((result) => {
      beginScanResultUpdate();
      applyScanResult(result, "Auto scan found");
    });
    const unsubscribeAutoScanError = window.wraeclastFieldNotes.onAutoScanError((message) => {
      setNotice(`Automatic scan failed: ${message}`);
    });
    let isMounted = true;

    void window.wraeclastFieldNotes.getAppInfo().then(setAppInfo).catch(() => undefined);
    void window.wraeclastFieldNotes.loadSettings().then((loaded) => {
      if (!isMounted) {
        return;
      }

      setSettings(loaded);
      void loadPrices(loaded.selectedLeagueId, false, loaded);
    });

    return () => {
      isMounted = false;
      unsubscribe();
      unsubscribeAutoScanResult();
      unsubscribeAutoScanError();
      void window.wraeclastFieldNotes.stopAutoScan().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!settings) {
      return;
    }

    let isCurrent = true;
    const scanResultVersion = beginScanResultUpdate();

    void window.wraeclastFieldNotes
      .loadCachedScan(settings.logPath, settings)
      .then((cachedResult) => {
        if (!isCurrent || !isCurrentScanResultUpdate(scanResultVersion)) {
          return;
        }

        applyScanResult(cachedResult, "Restored");
      })
      .catch(() => {
        if (isCurrent && isCurrentScanResultUpdate(scanResultVersion)) {
          setScanResult(null);
          setSelectedSessionId(null);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [settings?.logPath]);

  useEffect(() => {
    if (!settings) {
      return;
    }

    let isCurrent = true;

    void window.wraeclastFieldNotes.configureAutoScan(settings.logPath, settings).catch((error) => {
      if (isCurrent && settings.autoScanEnabled) {
        setNotice(error instanceof Error ? error.message : "Automatic scan setup failed.");
      }
    });

    return () => {
      isCurrent = false;
      void window.wraeclastFieldNotes.stopAutoScan().catch(() => undefined);
    };
  }, [
    settings?.autoScanEnabled,
    settings?.fixedStackedDeckPriceChaos,
    settings?.ignoredCardNames,
    settings?.logPath,
    settings?.profitFilters,
    settings?.sessionDeckPriceOverrides,
    settings?.sessionLeagueOverrides
  ]);

  const sessions = useMemo(
    () =>
      projectStackedDeckSessions(scanResult?.draws ?? [], priceSnapshots, settings?.sessionLeagueOverrides ?? {}, {
        fixedStackedDeckPriceChaos: settings?.fixedStackedDeckPriceChaos,
        pricingLeagueId: settings?.selectedLeagueId,
        profitFilters: settings?.profitFilters,
        ignoredCardNames: settings?.ignoredCardNames,
        sessionDeckPriceOverrides: settings?.sessionDeckPriceOverrides
      }).sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt)),
    [
      priceSnapshots,
      scanResult?.draws,
      settings?.fixedStackedDeckPriceChaos,
      settings?.ignoredCardNames,
      settings?.profitFilters,
      settings?.selectedLeagueId,
      settings?.sessionDeckPriceOverrides,
      settings?.sessionLeagueOverrides
    ]
  );

  const selectedSession = resolveSelectedSession(sessions, selectedSessionId);
  const selectedPriceSnapshot = settings ? priceSnapshots[settings.selectedLeagueId] : undefined;
  const summary = useMemo(() => summarizeSessions(sessions), [sessions]);

  useEffect(() => {
    const resolvedSessionId = resolveSelectedSessionId(sessions, selectedSessionId);
    if (resolvedSessionId !== selectedSessionId) {
      setSelectedSessionId(resolvedSessionId);
    }
  }, [selectedSessionId, sessions]);

  async function updateSettings(next: Settings): Promise<void> {
    setSettings(next);
    await window.wraeclastFieldNotes.saveSettings(next);
  }

  async function chooseLogFile(): Promise<void> {
    if (!settings) {
      return;
    }

    const filePath = await window.wraeclastFieldNotes.chooseLogFile();
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
    const scanResultVersion = beginScanResultUpdate();

    try {
      const result = await window.wraeclastFieldNotes.scanLog(settings.logPath, settings);
      if (!isCurrentScanResultUpdate(scanResultVersion)) {
        return;
      }

      applyScanResult(result, "Found");
    } catch (error) {
      if (isCurrentScanResultUpdate(scanResultVersion)) {
        setNotice(error instanceof Error ? error.message : "Scan failed.");
      }
    } finally {
      setIsScanning(false);
    }
  }

  async function loadPrices(leagueId: string, forceRefresh: boolean, priceSettings: Settings | null = settings): Promise<void> {
    if (!priceSettings) {
      return;
    }

    setPriceStatus(forceRefresh ? "Refreshing prices..." : "Loading prices...");

    try {
      const snapshot = await window.wraeclastFieldNotes.getPrices(
        leagueId,
        {
          mode: priceSettings.priceSourceMode,
          priority: priceSettings.priceSourcePriority
        },
        forceRefresh
      );
      setPriceSnapshots((current) => ({ ...current, [snapshot.leagueId]: snapshot }));
      setPriceStatus(
        `${snapshot.leagueName} ${formatSnapshotSource(snapshot)} prices ${
          snapshot.fromCache ? "from cache" : "updated"
        } at ${formatDateTime(snapshot.fetchedAt)}`
      );
    } catch (error) {
      setPriceStatus(error instanceof Error ? error.message : "Price refresh failed.");
    }
  }

  async function clearPriceCache(): Promise<void> {
    setIsClearingPriceCache(true);
    setPriceStatus("Clearing price cache...");

    try {
      await window.wraeclastFieldNotes.clearPriceCache();
      setPriceSnapshots({});
      setPriceStatus("Price cache cleared.");
    } catch (error) {
      setPriceStatus(error instanceof Error ? error.message : "Price cache clear failed.");
    } finally {
      setIsClearingPriceCache(false);
    }
  }

  async function checkForAppUpdate(): Promise<void> {
    setIsCheckingForUpdate(true);
    setAppUpdateStatus("Checking for updates...");

    try {
      const updateInfo = await window.wraeclastFieldNotes.checkForUpdate();
      setAppUpdateInfo(updateInfo);
      setAppUpdateStatus(
        updateInfo.updateAvailable
          ? `Version ${updateInfo.latestVersion} is available.`
          : `Current version ${updateInfo.currentVersion} is up to date.`
      );
    } catch (error) {
      setAppUpdateStatus(error instanceof Error ? error.message : "Update check failed.");
    } finally {
      setIsCheckingForUpdate(false);
    }
  }

  async function changePriceLeague(leagueId: string): Promise<void> {
    if (!settings) {
      return;
    }

    const nextSettings = { ...settings, selectedLeagueId: leagueId };
    await updateSettings(nextSettings);
    await loadPrices(leagueId, false, nextSettings);
  }

  async function changeCurrencyMode(currencyMode: Settings["currencyMode"]): Promise<void> {
    if (!settings) {
      return;
    }

    await updateSettings({ ...settings, currencyMode });
  }

  async function changeProfitFilters(profitFilters: Settings["profitFilters"]): Promise<void> {
    if (!settings) {
      return;
    }

    await updateSettings({ ...settings, profitFilters });
  }

  async function changePriceSourceMode(priceSourceMode: Settings["priceSourceMode"]): Promise<void> {
    if (!settings) {
      return;
    }

    const nextSettings = { ...settings, priceSourceMode };
    setPriceSnapshots({});
    await updateSettings(nextSettings);
    await loadPrices(nextSettings.selectedLeagueId, false, nextSettings);
  }

  async function changePriceSourcePriority(priceSourcePriority: Settings["priceSourcePriority"]): Promise<void> {
    if (!settings) {
      return;
    }

    const nextSettings = { ...settings, priceSourcePriority };
    setPriceSnapshots({});
    await updateSettings(nextSettings);
    await loadPrices(nextSettings.selectedLeagueId, false, nextSettings);
  }

  async function changeAutoScanEnabled(autoScanEnabled: boolean): Promise<void> {
    if (!settings) {
      return;
    }

    await updateSettings({ ...settings, autoScanEnabled });
  }

  async function changeFixedStackedDeckPrice(fixedStackedDeckPriceChaos: Settings["fixedStackedDeckPriceChaos"]): Promise<void> {
    if (!settings) {
      return;
    }

    await updateSettings({ ...settings, fixedStackedDeckPriceChaos });
  }

  async function changeSessionDeckPrice(sessionId: string, deckPriceChaos: number | null): Promise<void> {
    if (!settings) {
      return;
    }

    const sessionDeckPriceOverrides = { ...settings.sessionDeckPriceOverrides };

    if (deckPriceChaos === null || !Number.isFinite(deckPriceChaos) || deckPriceChaos < 0) {
      delete sessionDeckPriceOverrides[sessionId];
    } else {
      sessionDeckPriceOverrides[sessionId] = deckPriceChaos;
    }

    await updateSettings({
      ...settings,
      sessionDeckPriceOverrides
    });
  }

  async function changeSessionLeague(sessionId: string, leagueId: string): Promise<void> {
    if (!settings) {
      return;
    }

    const session = sessions.find((candidate) => candidate.id === sessionId);
    if (!session) {
      return;
    }

    const sessionLeagueOverrides = updateSessionLeagueOverrides(settings.sessionLeagueOverrides, session, leagueId);
    if (sessionLeagueOverrides === settings.sessionLeagueOverrides) {
      return;
    }

    const nextSettings = {
      ...settings,
      sessionLeagueOverrides
    };
    setSelectedSessionId(sessionId);
    await updateSettings(nextSettings);
  }

  async function toggleIgnoredCardValue(cardName: string): Promise<void> {
    if (!settings) {
      return;
    }

    const cardKey = normalizeCardKey(cardName);
    const ignoredCardNames = new Set(settings.ignoredCardNames);

    if (ignoredCardNames.has(cardKey)) {
      ignoredCardNames.delete(cardKey);
    } else {
      ignoredCardNames.add(cardKey);
    }

    await updateSettings({
      ...settings,
      ignoredCardNames: [...ignoredCardNames].sort()
    });
  }

  function refreshSelectedPrices(): void {
    if (!settings) {
      return;
    }

    void loadPrices(settings.selectedLeagueId, true, settings);
  }

  function selectSession(id: string): void {
    setSelectedSessionId(id);
  }

  function changeDataLeagueFilter(filterId: DataLeagueFilterId): void {
    setDataLeagueFilterId(filterId);
  }

  function beginScanResultUpdate(): number {
    scanResultVersionRef.current += 1;
    return scanResultVersionRef.current;
  }

  function isCurrentScanResultUpdate(version: number): boolean {
    return version === scanResultVersionRef.current;
  }

  function applyScanResult(result: ScanResult | null, noticePrefix: string): void {
    setScanResult(result);
    setSelectedSessionId(null);

    if (result) {
      setNotice(createScanNotice(result, noticePrefix));
    }
  }

  async function copyPayload(payload: { title: string; text: string }): Promise<void> {
    await window.wraeclastFieldNotes.copyText(payload.text);
    setNotice(`${payload.title} copied.`);
  }

  async function copyDiscord(session: DeckSession): Promise<void> {
    await copyPayload(createDiscordShare(session));
  }

  async function copyReddit(session: DeckSession): Promise<void> {
    await copyPayload(createRedditShare(session));
  }

  async function copyPoeHow(session: DeckSession): Promise<void> {
    await window.wraeclastFieldNotes.copyText(stringifyDraft(createPoeHowDraft(session, appInfo?.version)));
    setNotice("poe.how draft copied.");
  }

  async function savePoeHow(session: DeckSession): Promise<void> {
    const saved = await window.wraeclastFieldNotes.saveTextFile(
      `${session.id}-poe-how-draft.json`,
      stringifyDraft(createPoeHowDraft(session, appInfo?.version))
    );
    if (saved) {
      setNotice(`Saved ${saved}`);
    }
  }

  async function saveCsv(session: DeckSession): Promise<void> {
    const saved = await window.wraeclastFieldNotes.saveTextFile(`${session.id}.csv`, createCsv(session));
    if (saved) {
      setNotice(`Saved ${saved}`);
    }
  }

  function openExternal(url: string): void {
    void window.wraeclastFieldNotes.openExternal(url);
  }

  function openCardWiki(cardName: string): void {
    openExternal(getCardWikiUrl(cardName));
  }

  return {
    appInfo,
    appUpdateInfo,
    appUpdateStatus,
    changeAutoScanEnabled,
    changeCurrencyMode,
    changeDataLeagueFilter,
    changeFixedStackedDeckPrice,
    changePriceLeague,
    changePriceSourceMode,
    changePriceSourcePriority,
    changeProfitFilters,
    changeSessionDeckPrice,
    changeSessionLeague,
    checkForAppUpdate,
    chooseLogFile,
    clearPriceCache,
    copyDiscord,
    copyPoeHow,
    copyReddit,
    dataLeagueFilterId,
    isCheckingForUpdate,
    isClearingPriceCache,
    isScanning,
    notice,
    openExternal,
    openCardWiki,
    priceSnapshots,
    priceStatus,
    refreshSelectedPrices,
    saveCsv,
    savePoeHow,
    scanLog,
    scanProgress,
    scanRevision: scanResult?.scannedAt ?? null,
    selectSession,
    selectedPriceSnapshot,
    selectedSession,
    sessions,
    settings,
    summary,
    toggleIgnoredCardValue
  };
}

function formatSnapshotSource(snapshot: PriceSnapshot): string {
  if (snapshot.priceSourceMode === "hybrid") {
    return `hybrid (${formatPriceSource(snapshot.priceSourcePriority)} first)`;
  }

  return formatPriceSource(snapshot.priceSourceMode);
}

function formatPriceSource(source: "poe-watch" | "poe-ninja"): string {
  return source === "poe-watch" ? "poe.watch" : "poe.ninja";
}
