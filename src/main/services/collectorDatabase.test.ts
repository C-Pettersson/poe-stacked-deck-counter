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

    const first = new CollectorDatabase(directory);
    first.saveRun(run);
    first.close();

    const second = new CollectorDatabase(directory);
    expect(second.listRuns()).toMatchObject([{ id: run.id, title: "Harvest study", lifecycle: "draft" }]);
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
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "field-notes-db-"));
  directories.push(directory);
  return directory;
}
