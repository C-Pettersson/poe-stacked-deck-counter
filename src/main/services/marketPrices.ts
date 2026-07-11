import type { CatalogItem } from "../../domain/collection.js";
import type {
  MarketPriceDataset,
  MarketPriceQuote,
  MarketPriceRequest
} from "../../domain/marketPricing.js";
import { otherPriceSource } from "../../shared/priceSources.js";
import type { PriceConfidence, PriceSource } from "../../shared/types.js";

const CACHE_HOURS = 12;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;
const POE_WATCH_BASE_URL = "https://api.poe.watch";
const POE_NINJA_BASE_URL = "https://poe.ninja";

export interface MarketDatasetCache {
  readPriceDataset(cacheKey: string): Promise<MarketPriceDataset | null>;
  writePriceDataset(dataset: MarketPriceDataset): Promise<void>;
}

type FetchLike = typeof fetch;
type PoeNinjaDatasetKind = "exchange" | "stash-item";

interface PoeNinjaDatasetRequest {
  datasetKey: string;
  kind: PoeNinjaDatasetKind;
}

export class MarketPriceService {
  constructor(
    private readonly cache: MarketDatasetCache,
    private readonly appVersion = "development",
    private readonly fetchImpl: FetchLike = fetch
  ) {}

  async getQuotes(request: MarketPriceRequest): Promise<MarketPriceQuote[]> {
    if (request.items.length === 0) return [];

    const sources =
      request.options.mode === "hybrid"
        ? [request.options.priority, otherPriceSource(request.options.priority)]
        : [request.options.mode];
    const quotesBySource = new Map<PriceSource, Map<string, MarketPriceQuote>>();
    let lastError: unknown;

    for (const source of sources) {
      try {
        const quotes =
          source === "poe-watch"
            ? await this.getPoeWatchQuotes(request, request.forceRefresh === true)
            : await this.getPoeNinjaQuotes(request, request.forceRefresh === true);
        quotesBySource.set(source, new Map(quotes.map((quote) => [quote.detailsId, quote])));
      } catch (error) {
        lastError = error;
      }
    }

    if (quotesBySource.size === 0 && lastError) throw lastError;

    const result: MarketPriceQuote[] = [];
    for (const item of request.items) {
      for (const source of sources) {
        const quote = quotesBySource.get(source)?.get(item.detailsId);
        if (quote) {
          result.push(quote);
          break;
        }
      }
    }
    return result;
  }

  private async getPoeWatchQuotes(request: MarketPriceRequest, forceRefresh: boolean): Promise<MarketPriceQuote[]> {
    const url = new URL("/exchange/ratios", POE_WATCH_BASE_URL);
    url.searchParams.set("league", request.leagueName);
    url.searchParams.set("game", "poe1");
    const dataset = await this.getDataset("poe-watch", request.leagueName, "exchange", url.toString(), forceRefresh);
    return mapPoeWatchQuotes(request.items, dataset);
  }

  private async getPoeNinjaQuotes(request: MarketPriceRequest, forceRefresh: boolean): Promise<MarketPriceQuote[]> {
    const quotes: MarketPriceQuote[] = [];
    const itemsByDataset = new Map<string, { kind: PoeNinjaDatasetKind; items: CatalogItem[] }>();
    for (const item of request.items) {
      const dataset = poeNinjaDatasetFor(item);
      if (!dataset) continue;
      const existing = itemsByDataset.get(dataset.datasetKey);
      itemsByDataset.set(dataset.datasetKey, {
        kind: dataset.kind,
        items: [...(existing?.items ?? []), item]
      });
    }

    for (const [datasetKey, { kind, items }] of itemsByDataset) {
      const url = new URL(
        kind === "stash-item"
          ? "/poe1/api/economy/stash/current/item/overview"
          : "/poe1/api/economy/exchange/current/overview",
        POE_NINJA_BASE_URL
      );
      url.searchParams.set("league", request.leagueName);
      url.searchParams.set("type", datasetKey);
      try {
        const dataset = await this.getDataset("poe-ninja", request.leagueName, datasetKey, url.toString(), forceRefresh);
        quotes.push(
          ...(kind === "stash-item" ? mapPoeNinjaItemQuotes(items, dataset) : mapPoeNinjaQuotes(items, dataset))
        );
      } catch {
        // One unsupported poe.ninja dataset must not hide quotes from the other datasets or poe.watch.
      }
    }

    return quotes;
  }

  private async getDataset(
    source: PriceSource,
    leagueName: string,
    datasetKey: string,
    sourceUrl: string,
    forceRefresh: boolean
  ): Promise<MarketPriceDataset> {
    const cacheKey = `${source}:${leagueName}:${datasetKey}`.toLowerCase();
    const cached = await this.cache.readPriceDataset(cacheKey);
    if (cached && !forceRefresh && Date.parse(cached.expiresAt) > Date.now()) return cached;

    try {
      const payload = await fetchJsonBounded(sourceUrl, this.fetchImpl, this.appVersion);
      const fetchedAt = new Date();
      const dataset: MarketPriceDataset = {
        cacheKey,
        source,
        leagueName,
        datasetKey,
        sourceUrl,
        fetchedAt: fetchedAt.toISOString(),
        expiresAt: new Date(fetchedAt.getTime() + CACHE_HOURS * 60 * 60 * 1000).toISOString(),
        payload,
        fromCache: false
      };
      await this.cache.writePriceDataset(dataset);
      return dataset;
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  }
}

function mapPoeWatchQuotes(items: CatalogItem[], dataset: MarketPriceDataset): MarketPriceQuote[] {
  const payload = asRecord(dataset.payload);
  const entries = Array.isArray(payload?.items) ? payload.items.map(asRecord).filter(isRecord) : [];
  const byName = groupBy(entries, (entry) => normalizeName(entry.name));
  const quotes: MarketPriceQuote[] = [];

  for (const item of items) {
    const matches = byName.get(normalizeName(item.name)) ?? [];
    if (matches.length !== 1) continue;
    const side = asRecord(matches[0].chaos);
    const value = positiveNumber(side?.chaosValue ?? side?.value);
    if (value === null) continue;
    quotes.push(createQuote(item, value, confidenceFrom(side), dataset));
  }
  return quotes;
}

function mapPoeNinjaQuotes(items: CatalogItem[], dataset: MarketPriceDataset): MarketPriceQuote[] {
  const payload = asRecord(dataset.payload);
  const rawItems = Array.isArray(payload?.items) ? payload.items.map(asRecord).filter(isRecord) : [];
  const rawLines = Array.isArray(payload?.lines) ? payload.lines.map(asRecord).filter(isRecord) : [];
  const linesById = groupBy(rawLines, (line) => String(line.id ?? ""));
  const records = rawItems.flatMap((item) => {
    const matchingLines = linesById.get(String(item.id ?? "")) ?? [];
    return matchingLines.map((line) => ({ item, line }));
  });
  const byDetailsId = groupBy(records, (entry) => String(entry.item.detailsId ?? ""));
  const quotes: MarketPriceQuote[] = [];

  for (const item of items) {
    const matches = byDetailsId.get(item.detailsId) ?? [];
    if (matches.length !== 1) continue;
    const value = positiveNumber(
      matches[0].line.primaryValue ?? matches[0].line.chaosEquivalent ?? asRecord(matches[0].line.receive)?.value
    );
    if (value === null) continue;
    quotes.push(createQuote(item, value, confidenceFrom(matches[0].line), dataset));
  }
  return quotes;
}

function mapPoeNinjaItemQuotes(items: CatalogItem[], dataset: MarketPriceDataset): MarketPriceQuote[] {
  const payload = asRecord(dataset.payload);
  const lines = Array.isArray(payload?.lines) ? payload.lines.map(asRecord).filter(isRecord) : [];
  const byDetailsId = groupBy(lines, (line) => String(line.detailsId ?? ""));
  const quotes: MarketPriceQuote[] = [];

  for (const item of items) {
    const matches = byDetailsId.get(item.detailsId) ?? [];
    if (matches.length !== 1) continue;
    const value = positiveNumber(matches[0].chaosValue);
    if (value === null) continue;
    quotes.push(createQuote(item, value, confidenceFrom(matches[0]), dataset));
  }
  return quotes;
}

function createQuote(
  item: CatalogItem,
  chaosValue: number,
  confidence: PriceConfidence,
  dataset: MarketPriceDataset
): MarketPriceQuote {
  return {
    detailsId: item.detailsId,
    name: item.name,
    chaosValue,
    confidence,
    source: dataset.source,
    sourceUrl: dataset.sourceUrl,
    fetchedAt: dataset.fetchedAt,
    expiresAt: dataset.expiresAt,
    fromCache: dataset.fromCache
  };
}

function poeNinjaDatasetFor(item: CatalogItem): PoeNinjaDatasetRequest | null {
  const haystack = `${item.category ?? ""} ${item.itemType ?? ""} ${item.baseType ?? ""}`.toLowerCase();
  const mappings: Array<[RegExp, string, PoeNinjaDatasetKind]> = [
    [/uniqueaccessory|unique accessory/, "UniqueAccessory", "stash-item"],
    [/uniquearmour|unique armour/, "UniqueArmour", "stash-item"],
    [/uniqueweapon|unique weapon/, "UniqueWeapon", "stash-item"],
    [/divination|card/, "DivinationCard", "exchange"],
    [/currency|stacked deck/, "Currency", "exchange"],
    [/fragment/, "Fragment", "exchange"],
    [/scarab/, "Scarab", "exchange"],
    [/essence/, "Essence", "exchange"],
    [/fossil/, "Fossil", "exchange"],
    [/resonator/, "Resonator", "exchange"],
    [/oil/, "Oil", "exchange"],
    [/incubator/, "Incubator", "exchange"],
    [/tattoo/, "Tattoo", "exchange"],
    [/omen/, "Omen", "exchange"]
  ];
  const match = mappings.find(([pattern]) => pattern.test(haystack));
  return match ? { datasetKey: match[1], kind: match[2] } : null;
}

async function fetchJsonBounded(url: string, fetchImpl: FetchLike, appVersion: string): Promise<unknown> {
  const response = await fetchImpl(url, {
    headers: { "user-agent": `wraeclast-field-notes/${appVersion}` },
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`Price provider returned HTTP ${response.status}.`);
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new Error("Price provider response exceeded the configured limit.");
  }
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
    throw new Error("Price provider response exceeded the configured limit.");
  }
  return JSON.parse(text) as unknown;
}

function confidenceFrom(value: Record<string, unknown> | null): PriceConfidence {
  if (!value) return "unknown";
  if (typeof value.hasConfidence === "boolean") return value.hasConfidence ? "high" : "low";
  if (typeof value.lowConfidence === "boolean") return value.lowConfidence ? "low" : "high";
  if (typeof value.confidence === "number") return value.confidence > 0 ? "high" : "low";
  return "unknown";
}

function normalizeName(value: unknown): string {
  return typeof value === "string" ? value.normalize("NFKC").trim().toLowerCase() : "";
}

function positiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function groupBy<T>(values: T[], key: (value: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const value of values) {
    const target = key(value);
    grouped.set(target, [...(grouped.get(target) ?? []), value]);
  }
  return grouped;
}
