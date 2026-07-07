export type AppTab = "sessions" | "data" | "settings";
export type CurrencyDenomination = "chaos" | "divine";
export type CurrencyMode = "auto" | "chaos";
export type SessionCardExclusionReason = "card-value" | "stack-value" | "confidence";

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
}

export interface ScanResult {
  filePath: string;
  fileSize: number;
  scannedAt: string;
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
  hasPriceConfidence?: boolean;
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
  change7d?: number | null;
  icon?: string;
}

export interface CurrencyPrice {
  id: string;
  name: string;
  detailsId: string;
  chaosValue: number;
  icon?: string;
}

export interface PriceSnapshot {
  leagueId: string;
  leagueName: string;
  poeNinjaLeague: string;
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
  };
  fromCache: boolean;
}

export interface Settings {
  logPath: string;
  selectedLeagueId: string;
  currencyMode: CurrencyMode;
  profitFilters: ProfitFilters;
  sessionLeagueOverrides: Record<string, string>;
}

export interface ProfitFilters {
  minimumCardValueChaos: number;
  minimumStackValueChaos: number;
  requireConfidence: boolean;
}

export interface SharePayload {
  title: string;
  text: string;
}
