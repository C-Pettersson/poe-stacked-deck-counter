import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createHybridPriceSnapshot,
  createPoeWatchPriceSnapshot,
  createPriceSnapshot,
  cardPricesUrl,
  isSnapshotFresh,
  poeWatchExchangeUrl,
  sourceUrlsFor,
  stackedDeckUrl
} from "../../shared/pricing.js";
import { DEFAULT_PRICE_SOURCE_MODE, DEFAULT_PRICE_SOURCE_PRIORITY } from "../../shared/priceSources.js";
import type { CurrencyOverview, ExchangeOverview, PoeWatchExchangeRatios } from "../../shared/pricing.js";
import type { LeagueInfo, PriceSnapshot, PriceSource, PriceSourceOptions } from "../../shared/types.js";

const DEFAULT_PRICE_OPTIONS: PriceSourceOptions = {
  mode: DEFAULT_PRICE_SOURCE_MODE,
  priority: DEFAULT_PRICE_SOURCE_PRIORITY
};

export class PriceCache {
  private readonly cacheDir: string;

  constructor(userDataPath: string) {
    this.cacheDir = path.join(userDataPath, "price-cache");
  }

  async getPrices(
    league: LeagueInfo,
    optionsOrForceRefresh: PriceSourceOptions | boolean = DEFAULT_PRICE_OPTIONS,
    forceRefresh = false
  ): Promise<PriceSnapshot> {
    const { options, refresh } = normalizeGetPricesArgs(optionsOrForceRefresh, forceRefresh);
    const cacheKey = getCacheKey(league, options);
    const cached = await this.readSnapshot(cacheKey);

    if (cached && !refresh && isSnapshotFresh(cached) && usesCurrentPriceSources(cached, league, options)) {
      return { ...cached, fromCache: true };
    }

    try {
      const snapshot = await this.fetchSnapshot(league, options);
      await this.writeSnapshot(cacheKey, snapshot);
      return snapshot;
    } catch (error) {
      if (cached) {
        return { ...cached, fromCache: true };
      }

      throw error;
    }
  }

  async clear(): Promise<void> {
    await rm(this.cacheDir, { recursive: true, force: true });
  }

  private async fetchSnapshot(league: LeagueInfo, options: PriceSourceOptions): Promise<PriceSnapshot> {
    if (options.mode !== "hybrid") {
      const sourceSnapshot = await fetchSourceSnapshot(league, options.mode);
      return createHybridPriceSnapshot(league, { [options.mode]: sourceSnapshot }, options);
    }

    const results = await Promise.allSettled([
      fetchSourceSnapshot(league, "poe-watch"),
      fetchSourceSnapshot(league, "poe-ninja")
    ]);
    const snapshots: Partial<Record<PriceSource, PriceSnapshot>> = {};
    const failures: string[] = [];

    addSettledSnapshot(snapshots, failures, "poe-watch", results[0]);
    addSettledSnapshot(snapshots, failures, "poe-ninja", results[1]);

    if (!snapshots["poe-watch"] && !snapshots["poe-ninja"]) {
      throw new Error(`Price refresh failed: ${failures.join("; ")}`);
    }

    return createHybridPriceSnapshot(league, snapshots, options);
  }

  private async readSnapshot(cacheKey: string): Promise<PriceSnapshot | null> {
    try {
      const raw = await readFile(this.snapshotPath(cacheKey), "utf8");
      return JSON.parse(raw) as PriceSnapshot;
    } catch {
      return null;
    }
  }

  private async writeSnapshot(cacheKey: string, snapshot: PriceSnapshot): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true });
    await writeFile(this.snapshotPath(cacheKey), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  }

  private snapshotPath(cacheKey: string): string {
    return path.join(this.cacheDir, `${cacheKey}.json`);
  }
}

function normalizeGetPricesArgs(
  optionsOrForceRefresh: PriceSourceOptions | boolean,
  forceRefresh: boolean
): { options: PriceSourceOptions; refresh: boolean } {
  if (typeof optionsOrForceRefresh === "boolean") {
    return {
      options: DEFAULT_PRICE_OPTIONS,
      refresh: optionsOrForceRefresh
    };
  }

  return {
    options: optionsOrForceRefresh,
    refresh: forceRefresh
  };
}

async function fetchSourceSnapshot(league: LeagueInfo, source: PriceSource): Promise<PriceSnapshot> {
  if (source === "poe-watch") {
    const data = await getJson(poeWatchExchangeUrl(league.poeNinjaName), "poe.watch");
    return createPoeWatchPriceSnapshot(league, data as PoeWatchExchangeRatios);
  }

  const [cardsData, currencyData] = await Promise.all([
    getJson(cardPricesUrl(league.poeNinjaName), "poe.ninja"),
    getJson(stackedDeckUrl(league.poeNinjaName), "poe.ninja")
  ]);
  return createPriceSnapshot(league, cardsData as ExchangeOverview, currencyData as CurrencyOverview);
}

function addSettledSnapshot(
  snapshots: Partial<Record<PriceSource, PriceSnapshot>>,
  failures: string[],
  source: PriceSource,
  result: PromiseSettledResult<PriceSnapshot>
): void {
  if (result.status === "fulfilled") {
    snapshots[source] = result.value;
    return;
  }

  failures.push(`${source}: ${result.reason instanceof Error ? result.reason.message : "unknown error"}`);
}

function usesCurrentPriceSources(snapshot: PriceSnapshot, league: LeagueInfo, options: PriceSourceOptions): boolean {
  if (snapshot.priceSourceMode !== options.mode || snapshot.priceSourcePriority !== options.priority) {
    return false;
  }

  if (options.mode === "hybrid") {
    const primaryUrls = sourceUrlsFor(league, options.priority);
    const fallbackUrls = sourceUrlsFor(league, options.priority === "poe-watch" ? "poe-ninja" : "poe-watch");
    const currentCardsUrls = new Set([primaryUrls.cards, fallbackUrls.cards]);
    const currentStackedDeckUrls = new Set([primaryUrls.stackedDeck, fallbackUrls.stackedDeck]);
    const hasCurrentPrimary =
      typeof snapshot.sourceUrls?.cards === "string" &&
      typeof snapshot.sourceUrls.stackedDeck === "string" &&
      currentCardsUrls.has(snapshot.sourceUrls.cards) &&
      currentStackedDeckUrls.has(snapshot.sourceUrls.stackedDeck);
    const hasCurrentFallback =
      (snapshot.sourceUrls?.fallbackCards === undefined || currentCardsUrls.has(snapshot.sourceUrls.fallbackCards)) &&
      (snapshot.sourceUrls?.fallbackStackedDeck === undefined ||
        currentStackedDeckUrls.has(snapshot.sourceUrls.fallbackStackedDeck));
    return hasCurrentPrimary && hasCurrentFallback;
  }

  const urls = sourceUrlsFor(league, options.mode);
  return snapshot.sourceUrls?.cards === urls.cards && snapshot.sourceUrls?.stackedDeck === urls.stackedDeck;
}

function getCacheKey(league: LeagueInfo, options: PriceSourceOptions): string {
  return `${league.id}-${options.mode}-${options.priority}`;
}

async function getJson(url: string, sourceLabel: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "poe-stacked-deck-counter"
    }
  });

  if (!response.ok) {
    throw new Error(`${sourceLabel} returned ${response.status} for ${url}`);
  }

  return response.json();
}
