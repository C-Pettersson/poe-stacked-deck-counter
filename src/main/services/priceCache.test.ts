import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PriceCache } from "./priceCache.js";
import type { LeagueInfo } from "../../shared/types.js";

const tempDirs: string[] = [];

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("PriceCache", () => {
  it("clears persisted price snapshots", async () => {
    const userDataPath = await createTempDir();
    const cacheDir = path.join(userDataPath, "price-cache");
    const snapshotPaths = [path.join(cacheDir, "mirage.json"), path.join(cacheDir, "keepers.json")];
    await mkdir(cacheDir, { recursive: true });
    await Promise.all(snapshotPaths.map((snapshotPath) => writeFile(snapshotPath, "{}\n", "utf8")));

    await new PriceCache(userDataPath).clear();

    await Promise.all(snapshotPaths.map((snapshotPath) => expect(access(snapshotPath)).rejects.toThrow()));
  });

  it("allows clearing when the price cache has not been created", async () => {
    const userDataPath = await createTempDir();

    await expect(new PriceCache(userDataPath).clear()).resolves.toBeUndefined();
  });

  it("keeps price snapshots separate by source mode and priority", async () => {
    const userDataPath = await createTempDir();
    stubPriceFetches();
    const cache = new PriceCache(userDataPath);

    await cache.getPrices(makeLeague(), { mode: "hybrid", priority: "poe-watch" });
    await cache.getPrices(makeLeague(), { mode: "poe-ninja", priority: "poe-watch" });

    await expect(access(path.join(userDataPath, "price-cache", "mirage-hybrid-poe-watch.json"))).resolves.toBeUndefined();
    await expect(access(path.join(userDataPath, "price-cache", "mirage-poe-ninja-poe-watch.json"))).resolves.toBeUndefined();
  });

  it("uses the fallback source in hybrid mode when poe.watch fails", async () => {
    const userDataPath = await createTempDir();
    stubPriceFetches({ failPoeWatch: true });

    const snapshot = await new PriceCache(userDataPath).getPrices(makeLeague(), { mode: "hybrid", priority: "poe-watch" });

    expect(snapshot.priceSourceMode).toBe("hybrid");
    expect(snapshot.cards["the lover"]).toMatchObject({
      chaosValue: 1,
      source: "poe-ninja"
    });
  });
});

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "poe-price-cache-"));
  tempDirs.push(dir);
  return dir;
}

function stubPriceFetches(options: { failPoeWatch?: boolean } = {}): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL | Request) => {
      const target = String(url);

      if (target.includes("api.poe.watch")) {
        if (options.failPoeWatch) {
          return new Response("poe.watch unavailable", { status: 500 });
        }

        return jsonResponse({
          items: [
            {
              id: 1,
              name: "The Lover",
              category: "card",
              chaos: {
                value: 2,
                lowConfidence: false
              }
            }
          ]
        });
      }

      if (target.includes("type=DivinationCard")) {
        return jsonResponse({
          lines: [{ id: "the-lover", primaryValue: 1, lowConfidence: false }],
          items: [{ id: "the-lover", name: "The Lover", detailsId: "the-lover" }]
        });
      }

      return jsonResponse({
        lines: [],
        items: [],
        currencyDetails: []
      });
    })
  );
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json"
    }
  });
}

function makeLeague(): LeagueInfo {
  return {
    id: "mirage",
    name: "Mirage",
    poeNinjaName: "Mirage",
    poeNinjaSlug: "mirage",
    startsAt: "2026-01-01T00:00:00Z",
    endsAt: null,
    version: "3.99"
  };
}
