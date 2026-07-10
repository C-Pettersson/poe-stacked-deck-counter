import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_CURRENCY_MODE } from "../../shared/currencyFormat.js";
import { getDefaultLeague, isKnownLeagueId } from "../../shared/leagues.js";
import {
  DEFAULT_PRICE_SOURCE_MODE,
  DEFAULT_PRICE_SOURCE_PRIORITY,
  normalizePriceSource,
  normalizePriceSourceMode
} from "../../shared/priceSources.js";
import { normalizeCardKey } from "../../shared/pricing.js";
import { DEFAULT_PROFIT_FILTERS, normalizeProfitFilters } from "../../shared/profitFilters.js";
import type { EncounterNotificationSettings, Settings } from "../../shared/types.js";
import { defaultEncounterNotificationSettings, ENCOUNTER_DEFINITIONS } from "../../features/events/encounterCatalog.js";

export const DEFAULT_LOG_PATH = "C:\\games\\steamapps\\common\\Path of Exile\\logs\\Client.txt";

export function defaultSettings(): Settings {
  return {
    logPath: DEFAULT_LOG_PATH,
    selectedLeagueId: getDefaultLeague().id,
    currencyMode: DEFAULT_CURRENCY_MODE,
    autoScanEnabled: false,
    fixedStackedDeckPriceChaos: null,
    priceSourceMode: DEFAULT_PRICE_SOURCE_MODE,
    priceSourcePriority: DEFAULT_PRICE_SOURCE_PRIORITY,
    profitFilters: DEFAULT_PROFIT_FILTERS,
    ignoredCardNames: [],
    sessionLeagueOverrides: {},
    sessionDeckPriceOverrides: {},
    encounterNotifications: defaultEncounterNotificationSettings()
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
      selectedLeagueId: normalizeLeagueId(saved.selectedLeagueId),
      currencyMode: saved.currencyMode === "chaos" ? "chaos" : DEFAULT_CURRENCY_MODE,
      autoScanEnabled: saved.autoScanEnabled === true,
      fixedStackedDeckPriceChaos: normalizeOptionalChaosPrice(saved.fixedStackedDeckPriceChaos),
      priceSourceMode: normalizePriceSourceMode(saved.priceSourceMode),
      priceSourcePriority: normalizePriceSource(saved.priceSourcePriority),
      profitFilters: normalizeProfitFilters(saved.profitFilters),
      ignoredCardNames: normalizeIgnoredCardNames(saved.ignoredCardNames),
      sessionLeagueOverrides: normalizeSessionLeagueOverrides(saved.sessionLeagueOverrides),
      sessionDeckPriceOverrides: normalizeSessionDeckPriceOverrides(saved.sessionDeckPriceOverrides),
      encounterNotifications: normalizeEncounterNotificationSettings(saved.encounterNotifications)
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

function normalizeLeagueId(value: unknown): string {
  return isKnownLeagueId(value) ? value : defaultSettings().selectedLeagueId;
}

function normalizeSessionLeagueOverrides(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string" && isKnownLeagueId(entry[1]))
  );
}

function normalizeSessionDeckPriceOverrides(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] >= 0
    )
  );
}

function normalizeIgnoredCardNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((entry): entry is string => typeof entry === "string").map(normalizeCardKey).filter(Boolean))].sort();
}

export function normalizeEncounterNotificationSettings(value: unknown): EncounterNotificationSettings {
  const defaults = defaultEncounterNotificationSettings();
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;

  const saved = value as Partial<EncounterNotificationSettings>;
  const savedTriggers: Partial<EncounterNotificationSettings["triggers"]> =
    saved.triggers && typeof saved.triggers === "object" ? saved.triggers : {};
  const savedEncounters: Partial<EncounterNotificationSettings["encounters"]> =
    saved.encounters && typeof saved.encounters === "object" ? saved.encounters : {};

  return {
    enabled: typeof saved.enabled === "boolean" ? saved.enabled : defaults.enabled,
    triggers: {
      entered: typeof savedTriggers.entered === "boolean" ? savedTriggers.entered : defaults.triggers.entered,
      completion: typeof savedTriggers.completion === "boolean" ? savedTriggers.completion : defaults.triggers.completion,
      exited: typeof savedTriggers.exited === "boolean" ? savedTriggers.exited : defaults.triggers.exited
    },
    encounters: Object.fromEntries(ENCOUNTER_DEFINITIONS.map((definition) => {
      const fallback = defaults.encounters[definition.id];
      const candidate = savedEncounters[definition.id];
      return [definition.id, {
        enabled: typeof candidate?.enabled === "boolean" ? candidate.enabled : fallback.enabled,
        sound: typeof candidate?.sound === "boolean" ? candidate.sound : fallback.sound
      }];
    }))
  };
}
