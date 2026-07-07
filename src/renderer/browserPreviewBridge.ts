import packageJson from "../../package.json";
import { APP_RELEASES_URL } from "../shared/appUpdate.js";
import { DEFAULT_CURRENCY_ICONS } from "../shared/currencyIcons.js";
import { CHALLENGE_LEAGUES, getLeagueById } from "../shared/leagues.js";
import { DEFAULT_PROFIT_FILTERS, normalizeProfitFilters } from "../shared/profitFilters.js";
import { buildSessions } from "../shared/sessions.js";
import type {
  AppInfo,
  AppUpdateInfo,
  ClientLogDraw,
  LeagueInfo,
  PriceSnapshot,
  ScanProgress,
  ScanResult,
  Settings
} from "../shared/types.js";

const previewSettings: Settings = {
  logPath: "Browser preview sample data",
  selectedLeagueId: "mirage",
  currencyMode: "auto",
  autoScanEnabled: false,
  fixedStackedDeckPriceChaos: null,
  profitFilters: DEFAULT_PROFIT_FILTERS,
  sessionLeagueOverrides: {}
};

const previewAppInfo: AppInfo = {
  version: packageJson.version,
  releasesUrl: APP_RELEASES_URL
};

const PREVIEW_DIVINATION_ICON = "https://web.poecdn.com/image/Art/2DItems/Divination/InventoryIcon.png?scale=1&w=1&h=1";

const previewDraws: ClientLogDraw[] = [
  {
    id: "preview-1",
    lineNumber: 101,
    timestamp: "2026-01-15T18:00:00.000Z",
    cardName: "Emperor's Luck"
  },
  {
    id: "preview-2",
    lineNumber: 102,
    timestamp: "2026-01-15T18:00:01.000Z",
    cardName: "The Watcher"
  },
  {
    id: "preview-3",
    lineNumber: 103,
    timestamp: "2026-01-15T18:00:02.000Z",
    cardName: "The Hoarder"
  },
  {
    id: "preview-4",
    lineNumber: 104,
    timestamp: "2026-01-15T18:00:03.000Z",
    cardName: "The Hoarder"
  },
  {
    id: "preview-5",
    lineNumber: 205,
    timestamp: "2026-01-15T21:15:00.000Z",
    cardName: "The Doctor"
  },
  {
    id: "preview-6",
    lineNumber: 206,
    timestamp: "2026-01-15T21:15:01.000Z",
    cardName: "The Nurse"
  }
];

const progressListeners = new Set<(progress: ScanProgress) => void>();
const autoScanResultListeners = new Set<(result: ScanResult) => void>();
const autoScanErrorListeners = new Set<(message: string) => void>();

export function installBrowserPreviewBridge(): void {
  if ("poeDeck" in window && window.poeDeck) {
    return;
  }

  let settings = { ...previewSettings };
  let autoScanTimer: number | null = null;

  window.poeDeck = {
    loadSettings: async () => {
      const serverSettings = await getPreviewJson<Settings>("/settings").catch(() => previewSettings);
      settings = mergeSettings(serverSettings, loadSavedSettings());
      return settings;
    },
    saveSettings: async (nextSettings) => {
      settings = nextSettings;
      localStorage.setItem("poeDeckPreviewSettings", JSON.stringify(settings));
      return settings;
    },
    chooseLogFile: choosePreviewLogFile,
    scanLog: async (filePath, currentSettings) => {
      emitProgress(initialScanProgress());

      const result = await postPreviewJson<ScanResult>("/scan", { filePath, settings: currentSettings }).catch(() =>
        createFallbackScanResult(filePath, currentSettings)
      );

      emitProgress({
        bytesRead: result.fileSize,
        totalBytes: result.fileSize,
        linesRead: 0,
        drawsFound: result.draws.length
      });

      return result;
    },
    loadCachedScan: async (filePath, currentSettings) => {
      const cachedResult = await postPreviewJson<ScanResult | null>("/cached-scan", {
        filePath,
        settings: currentSettings
      }).catch(() => null);

      if (cachedResult) {
        return cachedResult;
      }

      if (filePath === previewSettings.logPath) {
        return {
          ...createFallbackScanResult(filePath, currentSettings),
          scanMode: "restored",
          bytesScanned: 0,
          cachedBytes: 2400
        };
      }

      return null;
    },
    configureAutoScan: async (filePath, currentSettings) => {
      if (autoScanTimer !== null) {
        window.clearTimeout(autoScanTimer);
        autoScanTimer = null;
      }

      if (!currentSettings.autoScanEnabled) {
        return false;
      }

      autoScanTimer = window.setTimeout(() => {
        autoScanTimer = null;
        emitAutoScanResult({
          ...createFallbackScanResult(filePath, currentSettings),
          scanMode: "cached",
          bytesScanned: 0,
          cachedBytes: 2400
        });
      }, 300);

      return true;
    },
    stopAutoScan: async () => {
      if (autoScanTimer !== null) {
        window.clearTimeout(autoScanTimer);
        autoScanTimer = null;
      }

      return true;
    },
    getPrices: async (leagueId, forceRefresh = false) =>
      getPreviewJson<PriceSnapshot>(`/prices?leagueId=${encodeURIComponent(leagueId)}&forceRefresh=${forceRefresh}`).catch(
        () => createPreviewSnapshot(leagueId)
      ),
    clearPriceCache: async () => {
      await postPreviewJson<{ ok: boolean }>("/price-cache/clear", {}).catch(() => undefined);
      return true;
    },
    copyText: async (text) => {
      await navigator.clipboard?.writeText(text).catch(() => undefined);
      return true;
    },
    saveTextFile: async (defaultFileName, content) => {
      const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = defaultFileName;
      link.click();
      URL.revokeObjectURL(url);
      return defaultFileName;
    },
    openExternal: async (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    getAppInfo: async () => getPreviewJson<AppInfo>("/app-info").catch(() => previewAppInfo),
    checkForUpdate: async () => getPreviewJson<AppUpdateInfo>("/app-update"),
    getLeagues: async () => getPreviewJson<LeagueInfo[]>("/leagues").catch(() => CHALLENGE_LEAGUES),
    onScanProgress: (listener) => {
      progressListeners.add(listener);
      return () => progressListeners.delete(listener);
    },
    onAutoScanResult: (listener) => {
      autoScanResultListeners.add(listener);
      return () => autoScanResultListeners.delete(listener);
    },
    onAutoScanError: (listener) => {
      autoScanErrorListeners.add(listener);
      return () => autoScanErrorListeners.delete(listener);
    }
  };
}

function loadSavedSettings(): Partial<Settings> {
  try {
    return JSON.parse(localStorage.getItem("poeDeckPreviewSettings") ?? "{}") as Partial<Settings>;
  } catch {
    return {};
  }
}

function mergeSettings(serverSettings: Settings, savedSettings: Partial<Settings>): Settings {
  return {
    ...serverSettings,
    ...savedSettings,
    logPath:
      savedSettings.logPath && savedSettings.logPath !== previewSettings.logPath
        ? savedSettings.logPath
        : serverSettings.logPath,
    currencyMode: savedSettings.currencyMode === "chaos" ? "chaos" : serverSettings.currencyMode ?? previewSettings.currencyMode,
    autoScanEnabled: savedSettings.autoScanEnabled === true,
    fixedStackedDeckPriceChaos: normalizeOptionalChaosPrice(
      Object.hasOwn(savedSettings, "fixedStackedDeckPriceChaos")
        ? savedSettings.fixedStackedDeckPriceChaos
        : serverSettings.fixedStackedDeckPriceChaos
    ),
    profitFilters: normalizeProfitFilters(savedSettings.profitFilters ?? serverSettings.profitFilters),
    sessionLeagueOverrides: savedSettings.sessionLeagueOverrides ?? serverSettings.sessionLeagueOverrides
  };
}

function choosePreviewLogFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,.log,text/plain";
    input.tabIndex = -1;
    input.style.position = "fixed";
    input.style.left = "-10000px";
    input.style.top = "0";
    input.style.opacity = "0";

    let isSettled = false;
    let focusTimer: number | null = null;

    const finish = (filePath: string | null): void => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      if (focusTimer !== null) {
        window.clearTimeout(focusTimer);
      }
      input.removeEventListener("change", onChange);
      input.removeEventListener("cancel", onCancel);
      window.removeEventListener("focus", onWindowFocus);
      input.remove();
      resolve(filePath);
    };

    const onChange = (): void => {
      const file = input.files?.[0] ?? null;
      finish(file ? file.name : null);
    };

    const onCancel = (): void => finish(null);

    const onWindowFocus = (): void => {
      focusTimer = window.setTimeout(() => {
        focusTimer = null;
        if (!input.files?.length) {
          finish(null);
        }
      }, 300);
    };

    input.addEventListener("change", onChange);
    input.addEventListener("cancel", onCancel);
    document.body.append(input);
    window.setTimeout(() => window.addEventListener("focus", onWindowFocus, { once: true }), 0);
    input.click();
  });
}

function initialScanProgress(): ScanProgress {
  return {
    bytesRead: 0,
    totalBytes: 0,
    linesRead: 0,
    drawsFound: 0
  };
}

function createFallbackScanResult(filePath: string, currentSettings: Settings): ScanResult {
  return {
    filePath,
    fileSize: 2400,
    scannedAt: new Date().toISOString(),
    scanMode: "full",
    bytesScanned: 2400,
    cachedBytes: 0,
    draws: previewDraws,
    sessions: buildSessions(previewDraws, null, currentSettings.sessionLeagueOverrides, {
      fixedStackedDeckPriceChaos: currentSettings.fixedStackedDeckPriceChaos,
      pricingLeagueId: currentSettings.selectedLeagueId,
      profitFilters: currentSettings.profitFilters
    })
  };
}

function normalizeOptionalChaosPrice(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

async function getPreviewJson<T>(path: string): Promise<T> {
  const response = await fetch(`/__poe-preview${path}`, { headers: { accept: "application/json" } });
  return readPreviewResponse<T>(response);
}

async function postPreviewJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/__poe-preview${path}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return readPreviewResponse<T>(response);
}

async function readPreviewResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Preview API returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function emitProgress(progress: ScanProgress): void {
  for (const listener of progressListeners) {
    listener(progress);
  }
}

function emitAutoScanResult(result: ScanResult): void {
  for (const listener of autoScanResultListeners) {
    listener(result);
  }
}

function emitAutoScanError(message: string): void {
  for (const listener of autoScanErrorListeners) {
    listener(message);
  }
}

function createPreviewSnapshot(leagueId: string): PriceSnapshot {
  const league = getLeagueById(leagueId);
  const fetchedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

  return {
    leagueId: league.id,
    leagueName: league.name,
    poeNinjaLeague: league.poeNinjaName,
    fetchedAt,
    expiresAt,
    fromCache: true,
    sourceUrls: {
      cards: `https://poe.ninja/poe1/economy/${league.poeNinjaSlug}/divination-cards`,
      stackedDeck: `https://poe.ninja/poe1/economy/${league.poeNinjaSlug}/currency/stacked-deck`
    },
    stackedDeck: {
      id: "stacked-deck",
      name: "Stacked Deck",
      detailsId: "stacked-deck",
      chaosValue: 2.4
    },
    currency: {
      chaos: {
        id: "chaos-orb",
        name: "Chaos Orb",
        detailsId: "chaos-orb",
        chaosValue: 1,
        icon: DEFAULT_CURRENCY_ICONS.chaos.icon
      },
      divine: {
        id: "divine-orb",
        name: "Divine Orb",
        detailsId: "divine-orb",
        chaosValue: 210,
        icon: DEFAULT_CURRENCY_ICONS.divine.icon
      }
    },
    cards: {
      "emperor's luck": {
        id: "emperors-luck",
        name: "Emperor's Luck",
        detailsId: "emperors-luck",
        chaosValue: 0.3,
        volumeChaosValue: 0.25,
        hasConfidence: false,
        change7d: -2.1,
        icon: PREVIEW_DIVINATION_ICON
      },
      "the watcher": {
        id: "the-watcher",
        name: "The Watcher",
        detailsId: "the-watcher",
        chaosValue: 0.5,
        volumeChaosValue: 0.4,
        hasConfidence: true,
        change7d: 1.4
      },
      "the hoarder": {
        id: "the-hoarder",
        name: "The Hoarder",
        detailsId: "the-hoarder",
        chaosValue: 8,
        volumeChaosValue: 7.5,
        hasConfidence: true,
        change7d: 4.7,
        icon: PREVIEW_DIVINATION_ICON
      },
      "the doctor": {
        id: "the-doctor",
        name: "The Doctor",
        detailsId: "the-doctor",
        chaosValue: 1260,
        volumeChaosValue: 1200,
        hasConfidence: true,
        change7d: 8.2,
        icon: PREVIEW_DIVINATION_ICON
      },
      "the nurse": {
        id: "the-nurse",
        name: "The Nurse",
        detailsId: "the-nurse",
        chaosValue: 120,
        volumeChaosValue: 110,
        hasConfidence: true,
        change7d: 3.5
      }
    }
  };
}
