import { describe, expect, it, vi } from "vitest";
import type { CatalogSnapshot } from "../../domain/collection.js";
import { PoeHowCatalogService, type PoeHowPublicClient } from "./poeHowCatalog.js";

class MemoryCatalogCache {
  snapshot: CatalogSnapshot | null = null;
  readCatalog(): Promise<CatalogSnapshot | null> {
    return Promise.resolve(this.snapshot);
  }
  writeCatalog(snapshot: CatalogSnapshot): Promise<void> {
    this.snapshot = snapshot;
    return Promise.resolve();
  }
}

describe("public poe.how catalog", () => {
  it("uses only public metadata procedures and validates their responses", async () => {
    const cache = new MemoryCatalogCache();
    const query = vi.fn(async (path: string) => responses[path]);
    const service = new PoeHowCatalogService(cache, "1.0.0", { query } as PoeHowPublicClient);
    const snapshot = await service.getCatalog();

    expect(query.mock.calls.map(([path]) => path)).toEqual([
      "strategies.templates.listActive",
      "strategies.categories.list",
      "league.list",
      "releaseVersions.list"
    ]);
    expect(snapshot.templates[0]).toMatchObject({ name: "stacked-deck", revision: "2026-07-10T10:00:00.000Z" });
    expect(cache.snapshot?.fromCache).toBe(false);
  });

  it("retains last-known-good data when a response becomes incompatible", async () => {
    const cache = new MemoryCatalogCache();
    cache.snapshot = {
      fetchedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T06:00:00.000Z",
      templates: [],
      categories: [],
      leagues: [],
      releaseVersions: [],
      fromCache: false
    };
    const client: PoeHowPublicClient = { query: async () => ({ incompatible: true }) };
    const snapshot = await new PoeHowCatalogService(cache, "1.0.0", client).getCatalog(true);
    expect(snapshot).toMatchObject({ fetchedAt: "2026-01-01T00:00:00.000Z", fromCache: true });
  });

  it("contract-validates item search results", async () => {
    const cache = new MemoryCatalogCache();
    const client: PoeHowPublicClient = {
      query: async (path) => path === "items.search"
        ? {
            items: [{
              detailsId: "enlighten-support-4c",
              name: "Enlighten Support",
              category: "SkillGem",
              tags: [
                { id: 1, name: "level-4", hidden: true },
                { id: 2, name: "quality-0", hidden: true },
                { id: 3, name: "corrupted", hidden: true }
              ]
            }]
          }
        : []
    };
    const itemDetails = { enrichItems: vi.fn(async (items) => items) };
    await expect(new PoeHowCatalogService(cache, "1.0.0", client, itemDetails).searchItems("enlighten")).resolves.toMatchObject([
      {
        detailsId: "enlighten-support-4c",
        name: "Enlighten Support",
        tags: [
          { name: "level-4", hidden: true },
          { name: "quality-0", hidden: true },
          { name: "corrupted", hidden: true }
        ]
      }
    ]);
    expect(itemDetails.enrichItems).toHaveBeenCalledOnce();
  });
});

const responses: Record<string, unknown> = {
  "strategies.templates.listActive": [{
    id: 1,
    name: "stacked-deck",
    title: "Stacked Decks",
    description: "Open decks",
    strategyCategoryId: 2,
    active: true,
    fixedResult: false,
    allowRequirementSubmission: true,
    updatedAt: "2026-07-10T10:00:00.000Z",
    requirements: [{ id: 3, amount: 100, item: { detailsId: "stacked-deck", name: "Stacked Deck" } }],
    rewards: []
  }],
  "strategies.categories.list": [{ id: 2, name: "loot", header: "Loot", description: "Loot research" }],
  "league.list": [{ id: "mirage", name: "Mirage", displayName: "Mirage" }],
  "releaseVersions.list": [{ id: "poe1", version: "3.28", name: "3.28", current: true, active: true }]
};
