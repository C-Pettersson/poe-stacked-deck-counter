import type { CatalogItem } from "./collection.js";
import type { PriceConfidence, PriceSource, PriceSourceOptions } from "../shared/types.js";

export interface MarketPriceRequest {
  leagueName: string;
  items: CatalogItem[];
  options: PriceSourceOptions;
  forceRefresh?: boolean;
}

export interface MarketPriceQuote {
  detailsId: string;
  name: string;
  chaosValue: number;
  confidence: PriceConfidence;
  source: PriceSource;
  sourceUrl: string;
  fetchedAt: string;
  expiresAt: string;
  fromCache: boolean;
}

export interface MarketPriceDataset {
  cacheKey: string;
  source: PriceSource;
  leagueName: string;
  datasetKey: string;
  sourceUrl: string;
  fetchedAt: string;
  expiresAt: string;
  payload: unknown;
  fromCache: boolean;
}
