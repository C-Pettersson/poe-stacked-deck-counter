import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createCollectionRun } from "../../domain/collection.js";
import { CollectorDatabase } from "./collectorDatabase.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("CollectorDatabase", () => {
  it("creates, reopens, and updates versioned collection runs", async () => {
    const directory = await temporaryDirectory();
    const run = createCollectionRun(null, { now: new Date("2026-07-10T10:00:00.000Z") });
    run.title = "Harvest study";
    run.items.push({
      id: "item-lycosidae",
      role: "reward",
      detailsId: "lycosidae-rawhide-tower-shield",
      name: "Lycosidae",
      baseType: "Rawhide Tower Shield",
      itemType: "Shield",
      amount: 1,
      provenance: "manual",
      gameData: {
        rarity: "Unique",
        properties: ["Chance to Block: (29-31)%"],
        requirements: ["Requires Level 11, 33 Str"],
        implicitModifiers: ["+(10-20) to maximum Life"],
        explicitModifiers: ["Your hits can't be Evaded"],
        flavourText: "A true predator does not chase; It waits."
      }
    });

    const first = new CollectorDatabase(directory);
    first.saveRun(run);
    first.close();

    const second = new CollectorDatabase(directory);
    expect(second.listRuns()).toMatchObject([{
      id: run.id,
      title: "Harvest study",
      lifecycle: "draft",
      items: [{ name: "Lycosidae", baseType: "Rawhide Tower Shield", gameData: { rarity: "Unique" } }]
    }]);
    run.lifecycle = "archived";
    second.saveRun(run);
    expect(second.listRuns()).toEqual([]);
    expect(second.listRuns(true)[0].lifecycle).toBe("archived");
    second.close();
  });

  it("round-trips normalized provider datasets", async () => {
    const directory = await temporaryDirectory();
    const database = new CollectorDatabase(directory);
    database.writePriceDataset({
      cacheKey: "poe-watch:mirage:exchange",
      source: "poe-watch",
      leagueName: "Mirage",
      datasetKey: "exchange",
      sourceUrl: "https://api.poe.watch/exchange/ratios",
      fetchedAt: "2026-07-10T10:00:00.000Z",
      expiresAt: "2026-07-10T22:00:00.000Z",
      payload: { items: [] },
      fromCache: false
    });
    expect(database.readPriceDataset("poe-watch:mirage:exchange")).toMatchObject({
      source: "poe-watch",
      leagueName: "Mirage",
      fromCache: true
    });
    database.close();
  });

  it("persists completed and active Client.txt encounters in scan checkpoints", async () => {
    const directory = await temporaryDirectory();
    const database = new CollectorDatabase(directory);
    const activeEncounter = {
      id: "encounter:the-maven:10:start",
      encounterId: "the-maven",
      title: "The Maven",
      boss: "The Maven",
      areaName: "Absence of Mercy and Empathy",
      startedAt: "2026-07-11T18:00:00.000Z",
      startLine: 10
    };
    database.writeScanSnapshot({
      version: 1,
      filePath: "Client.txt",
      normalizedPath: "client.txt",
      fileSize: 0,
      linesRead: 20,
      scannedAt: "2026-07-11T18:10:00.000Z",
      draws: [],
      pendingDraw: null,
      encounters: [{
        ...activeEncounter,
        id: "encounter:the-maven:1:older",
        startLine: 1,
        startedAt: "2026-07-11T17:00:00.000Z",
        endedAt: "2026-07-11T17:05:00.000Z",
        endLine: 5,
        leftToAreaName: "Karui Shores"
      }],
      encounterState: { pendingArea: null, activeEncounter },
      anchor: null
    });

    const restored = database.readScanSnapshot("client.txt");
    expect(restored?.encounters[0]).toMatchObject({ encounterId: "the-maven", endLine: 5 });
    expect(restored?.encounterState.activeEncounter).toMatchObject({ encounterId: "the-maven", startLine: 10 });
    database.close();
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "field-notes-db-"));
  directories.push(directory);
  return directory;
}
