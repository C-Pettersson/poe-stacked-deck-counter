import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PriceCache } from "./priceCache.js";

const tempDirs: string[] = [];

afterEach(async () => {
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
});

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "poe-price-cache-"));
  tempDirs.push(dir);
  return dir;
}
