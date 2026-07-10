import type {
  AppInfo,
  AppUpdateInfo,
  LeagueInfo,
  PriceSnapshot,
  PriceSourceOptions,
  ScanProgress,
  ScanResult,
  Settings
} from "../shared/types.js";
import type { CatalogItem, CatalogSnapshot, CollectionRun } from "../domain/collection.js";
import type { MarketPriceQuote, MarketPriceRequest } from "../domain/marketPricing.js";

declare global {
  interface Window {
    wraeclastFieldNotes: {
      loadSettings: () => Promise<Settings>;
      saveSettings: (settings: Settings) => Promise<Settings>;
      chooseLogFile: () => Promise<string | null>;
      scanLog: (filePath: string, settings: Settings) => Promise<ScanResult>;
      loadCachedScan: (filePath: string, settings: Settings) => Promise<ScanResult | null>;
      configureAutoScan: (filePath: string, settings: Settings) => Promise<boolean>;
      stopAutoScan: () => Promise<boolean>;
      getPrices: (leagueId: string, options: PriceSourceOptions, forceRefresh?: boolean) => Promise<PriceSnapshot>;
      clearPriceCache: () => Promise<boolean>;
      copyText: (text: string) => Promise<boolean>;
      saveTextFile: (defaultFileName: string, content: string) => Promise<string | null>;
      openExternal: (url: string) => Promise<void>;
      getAppInfo: () => Promise<AppInfo>;
      checkForUpdate: () => Promise<AppUpdateInfo>;
      getLeagues: () => Promise<LeagueInfo[]>;
      getCatalog: (forceRefresh?: boolean) => Promise<CatalogSnapshot>;
      searchCatalogItems: (query: string) => Promise<CatalogItem[]>;
      listRuns: (includeArchived?: boolean) => Promise<CollectionRun[]>;
      saveRun: (run: CollectionRun) => Promise<CollectionRun>;
      getMarketQuotes: (request: MarketPriceRequest) => Promise<MarketPriceQuote[]>;
      onScanProgress: (listener: (progress: ScanProgress) => void) => () => void;
      onAutoScanResult: (listener: (result: ScanResult) => void) => () => void;
      onAutoScanError: (listener: (message: string) => void) => () => void;
    };
  }
}

export {};
