export type AppTab = "collect" | "runs" | "deck-runs" | "deck-data" | "settings";
export type CurrencyDenomination = "chaos" | "divine";
export type CurrencyMode = "auto" | "chaos";
export type ConfidenceFilter = "any" | "exclude-low" | "high-only" | "low-only" | "unknown-only";
export type PriceConfidence = "high" | "low" | "unknown";
export type PriceSource = "poe-watch" | "poe-ninja";
export type PriceSourceMode = "hybrid" | PriceSource;
export type ScanMode = "full" | "incremental" | "cached" | "restored";
export type SessionCardExclusionReason = "card-value" | "stack-value" | "confidence" | "manual-ignore";

export interface LeagueInfo {
  id: string;
  name: string;
  poeNinjaName: string;
  poeNinjaSlug: string;
  startsAt: string;
  endsAt: string | null;
  version: string;
}

export interface ClientLogDraw {
  id: string;
  lineNumber: number;
  timestamp: string;
  cardName: string;
}

export interface ScanProgress {
  bytesRead: number;
  totalBytes: number;
  linesRead: number;
  drawsFound: number;
  cachedBytes?: number;
  scanMode?: ScanMode;
}

export interface ScanResult {
  filePath: string;
  fileSize: number;
  scannedAt: string;
  scanMode?: ScanMode;
  bytesScanned?: number;
  cachedBytes?: number;
  draws: ClientLogDraw[];
  sessions: DeckSession[];
}

export interface DeckSession {
  id: string;
  startAt: string;
  endAt: string;
  leagueId: string;
  leagueName: string;
  poeNinjaLeague: string;
  pricingLeagueId?: string;
  source: "auto" | "manual";
  draws: ClientLogDraw[];
  cards: SessionCard[];
  totalCards: number;
  uniqueCards: number;
  totalValueChaos: number;
  stackedDeckCostChaos: number;
  profitChaos: number;
  pricedCards: number;
  missingPrices: number;
}

export interface SessionCard {
  name: string;
  count: number;
  priceChaos: number | null;
  totalChaos: number | null;
  includedValueChaos?: number | null;
  exclusionReason?: SessionCardExclusionReason;
  isValueIgnored?: boolean;
  hasPriceConfidence?: boolean;
  priceConfidence?: PriceConfidence;
  priceSource?: PriceSource;
  detailsId?: string;
  icon?: string;
  change7d?: number | null;
}

export interface CardPrice {
  id: string;
  name: string;
  detailsId: string;
  chaosValue: number;
  volumeChaosValue?: number;
  hasConfidence?: boolean;
  confidence: PriceConfidence;
  source: PriceSource;
  change7d?: number | null;
  icon?: string;
}

export interface CurrencyPrice {
  id: string;
  name: string;
  detailsId: string;
  chaosValue: number;
  confidence: PriceConfidence;
  source: PriceSource;
  icon?: string;
}

export interface PriceSourceOptions {
  mode: PriceSourceMode;
  priority: PriceSource;
}

export interface PriceSnapshot {
  leagueId: string;
  leagueName: string;
  poeNinjaLeague: string;
  priceSourceMode: PriceSourceMode;
  priceSourcePriority: PriceSource;
  fetchedAt: string;
  expiresAt: string;
  cards: Record<string, CardPrice>;
  stackedDeck: CurrencyPrice | null;
  currency?: {
    chaos: CurrencyPrice;
    divine: CurrencyPrice | null;
  };
  sourceUrls: {
    cards: string;
    stackedDeck: string;
    fallbackCards?: string;
    fallbackStackedDeck?: string;
  };
  fromCache: boolean;
}

export interface AppInfo {
  version: string;
  releasesUrl: string;
}

export interface AppUpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  checkedAt: string;
  updateAvailable: boolean;
}

export interface Settings {
  logPath: string;
  selectedLeagueId: string;
  currencyMode: CurrencyMode;
  autoScanEnabled: boolean;
  fixedStackedDeckPriceChaos: number | null;
  priceSourceMode: PriceSourceMode;
  priceSourcePriority: PriceSource;
  profitFilters: ProfitFilters;
  ignoredCardNames: string[];
  sessionLeagueOverrides: Record<string, string>;
  sessionDeckPriceOverrides: Record<string, number>;
}

export interface ProfitFilters {
  minimumCardValueChaos: number;
  minimumStackValueChaos: number;
  confidenceFilter: ConfidenceFilter;
}

export interface SharePayload {
  title: string;
  text: string;
}
