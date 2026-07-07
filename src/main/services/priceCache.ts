import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createPriceSnapshot, cardPricesUrl, isSnapshotFresh, stackedDeckUrl } from "../../shared/pricing.js";
import type { CurrencyOverview, ExchangeOverview } from "../../shared/pricing.js";
import type { LeagueInfo, PriceSnapshot } from "../../shared/types.js";

export class PriceCache {
  private readonly cacheDir: string;

  constructor(userDataPath: string) {
    this.cacheDir = path.join(userDataPath, "price-cache");
  }

  async getPrices(league: LeagueInfo, forceRefresh = false): Promise<PriceSnapshot> {
    const cached = await this.readSnapshot(league.id);

    if (cached && !forceRefresh && isSnapshotFresh(cached) && usesCurrentPriceSources(cached, league)) {
      return { ...cached, fromCache: true };
    }

    try {
      const [cardsData, currencyData] = await Promise.all([
        getJson(cardPricesUrl(league.poeNinjaName)),
        getJson(stackedDeckUrl(league.poeNinjaName))
      ]);
      const snapshot = createPriceSnapshot(league, cardsData as ExchangeOverview, currencyData as CurrencyOverview);
      await this.writeSnapshot(snapshot);
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

  private async readSnapshot(leagueId: string): Promise<PriceSnapshot | null> {
    try {
      const raw = await readFile(this.snapshotPath(leagueId), "utf8");
      return JSON.parse(raw) as PriceSnapshot;
    } catch {
      return null;
    }
  }

  private async writeSnapshot(snapshot: PriceSnapshot): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true });
    await writeFile(this.snapshotPath(snapshot.leagueId), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  }

  private snapshotPath(leagueId: string): string {
    return path.join(this.cacheDir, `${leagueId}.json`);
  }
}

function usesCurrentPriceSources(snapshot: PriceSnapshot, league: LeagueInfo): boolean {
  return (
    snapshot.sourceUrls?.cards === cardPricesUrl(league.poeNinjaName) &&
    snapshot.sourceUrls?.stackedDeck === stackedDeckUrl(league.poeNinjaName)
  );
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "poe-stacked-deck-counter"
    }
  });

  if (!response.ok) {
    throw new Error(`poe.ninja returned ${response.status} for ${url}`);
  }

  return response.json();
}
