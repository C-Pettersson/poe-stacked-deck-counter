import { describe, expect, it, vi } from "vitest";
import type { MarketPriceDataset } from "../../domain/marketPricing.js";
import { MarketPriceService, type MarketDatasetCache } from "./marketPrices.js";

class MemoryCache implements MarketDatasetCache {
  readonly values = new Map<string, MarketPriceDataset>();
  readPriceDataset(key: string): Promise<MarketPriceDataset | null> {
    return Promise.resolve(this.values.get(key) ?? null);
  }
  writePriceDataset(dataset: MarketPriceDataset): Promise<void> {
    this.values.set(dataset.cacheKey, dataset);
    return Promise.resolve();
  }
}

describe("generic market pricing", () => {
  it("uses hybrid fallback and leaves ambiguous items unpriced", async () => {
    const cache = new MemoryCache();
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.includes("api.poe.watch")) return new Response("unavailable", { status: 503 });
      return new Response(JSON.stringify({
        items: [{ id: "1", name: "The Doctor", detailsId: "the-doctor" }],
        lines: [{ id: "1", primaryValue: 80, lowConfidence: false }]
      }));
    });
    const service = new MarketPriceService(cache, "1.0.0", fetchImpl);
    const quotes = await service.getQuotes({
      leagueName: "Mirage",
      items: [
        { detailsId: "the-doctor", name: "The Doctor", category: "Divination Card" },
        { detailsId: "unknown", name: "Unknown Item" }
      ],
      options: { mode: "hybrid", priority: "poe-watch" }
    });

    expect(quotes).toMatchObject([{ detailsId: "the-doctor", chaosValue: 80, source: "poe-ninja" }]);
    expect(quotes.find((quote) => quote.detailsId === "unknown")).toBeUndefined();
  });

  it("retains stale quotes when a refresh fails", async () => {
    const cache = new MemoryCache();
    cache.values.set("poe-watch:mirage:exchange", {
      cacheKey: "poe-watch:mirage:exchange",
      source: "poe-watch",
      leagueName: "Mirage",
      datasetKey: "exchange",
      sourceUrl: "https://api.poe.watch/exchange/ratios",
      fetchedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T12:00:00.000Z",
      payload: { items: [{ name: "Chaos Orb", chaos: { value: 1, lowConfidence: false } }] },
      fromCache: true
    });
    const service = new MarketPriceService(cache, "1.0.0", vi.fn(async () => new Response("down", { status: 503 })));
    const quotes = await service.getQuotes({
      leagueName: "Mirage",
      items: [{ detailsId: "chaos-orb", name: "Chaos Orb", category: "Currency" }],
      options: { mode: "poe-watch", priority: "poe-watch" },
      forceRefresh: true
    });
    expect(quotes[0]).toMatchObject({ chaosValue: 1, fromCache: true });
  });
});
