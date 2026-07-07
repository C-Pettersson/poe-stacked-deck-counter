import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_CURRENCY_MODE } from "../../shared/currencyFormat.js";
import { getDefaultLeague } from "../../shared/leagues.js";
import { DEFAULT_PROFIT_FILTERS, normalizeProfitFilters } from "../../shared/profitFilters.js";
import type { Settings } from "../../shared/types.js";

export const DEFAULT_LOG_PATH = "C:\\games\\steamapps\\common\\Path of Exile\\logs\\Client.txt";

export function defaultSettings(): Settings {
  return {
    logPath: DEFAULT_LOG_PATH,
    selectedLeagueId: getDefaultLeague().id,
    currencyMode: DEFAULT_CURRENCY_MODE,
    autoScanEnabled: false,
    fixedStackedDeckPriceChaos: null,
    profitFilters: DEFAULT_PROFIT_FILTERS,
    sessionLeagueOverrides: {}
  };
}

export async function loadSettings(userDataPath: string): Promise<Settings> {
  const settingsPath = getSettingsPath(userDataPath);

  try {
    const raw = await readFile(settingsPath, "utf8");
    const saved = JSON.parse(raw) as Partial<Settings>;
    return {
      ...defaultSettings(),
      ...saved,
      currencyMode: saved.currencyMode === "chaos" ? "chaos" : DEFAULT_CURRENCY_MODE,
      autoScanEnabled: saved.autoScanEnabled === true,
      fixedStackedDeckPriceChaos: normalizeOptionalChaosPrice(saved.fixedStackedDeckPriceChaos),
      profitFilters: normalizeProfitFilters(saved.profitFilters),
      sessionLeagueOverrides: saved.sessionLeagueOverrides ?? {}
    };
  } catch {
    return defaultSettings();
  }
}

export async function saveSettings(userDataPath: string, settings: Settings): Promise<Settings> {
  await mkdir(userDataPath, { recursive: true });
  await writeFile(getSettingsPath(userDataPath), `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return settings;
}

function getSettingsPath(userDataPath: string): string {
  return path.join(userDataPath, "settings.json");
}

function normalizeOptionalChaosPrice(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
