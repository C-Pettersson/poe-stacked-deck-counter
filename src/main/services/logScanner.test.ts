import { appendFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LogScanCache } from "./logScanCache.js";
import { scanClientLog } from "./logScanner.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("scanClientLog cache", () => {
  it("stores a full scan and reuses the cache when the file is unchanged", async () => {
    const fixture = await createFixture(
      "2026/07/07 11:00:00 1 a [INFO Client 1] : Card drawn from the deck: <divination>{The Lover}\n"
    );

    const firstScan = await scanClientLog(fixture.logPath, { cache: fixture.cache });
    const secondScan = await scanClientLog(fixture.logPath, { cache: fixture.cache });

    expect(firstScan.scanMode).toBe("full");
    expect(firstScan.draws.map((draw) => draw.cardName)).toEqual(["The Lover"]);
    expect(firstScan.linesRead).toBe(1);
    expect(secondScan.scanMode).toBe("cached");
    expect(secondScan.bytesScanned).toBe(0);
    expect(secondScan.cachedBytes).toBe(firstScan.fileSize);
    expect(secondScan.draws).toEqual(firstScan.draws);
  });

  it("scans only appended bytes and merges new draws with cached draws", async () => {
    const initialLog =
      "2026/07/07 11:00:00 1 a [INFO Client 1] : Card drawn from the deck: <divination>{The Lover}\n";
    const appendedLog =
      "2026/07/07 11:00:01 2 a [INFO Client 1] : Card drawn from the deck: <divination>{The Wolf}\n";
    const fixture = await createFixture(initialLog);
    const firstScan = await scanClientLog(fixture.logPath, { cache: fixture.cache });

    await appendFile(fixture.logPath, appendedLog, "utf8");
    const secondScan = await scanClientLog(fixture.logPath, { cache: fixture.cache });

    expect(secondScan.scanMode).toBe("incremental");
    expect(secondScan.cachedBytes).toBe(firstScan.fileSize);
    expect(secondScan.bytesScanned).toBe(Buffer.byteLength(appendedLog));
    expect(secondScan.linesRead).toBe(2);
    expect(secondScan.draws.map((draw) => draw.cardName)).toEqual(["The Lover", "The Wolf"]);
  });

  it("resumes a wrapped draw split across scans", async () => {
    const fixture = await createFixture(
      "2026/07/07 11:00:00 1 a [INFO Client 1] : Card drawn from the deck:\n"
    );
    const firstScan = await scanClientLog(fixture.logPath, { cache: fixture.cache });

    await appendFile(fixture.logPath, "<divination>{Emperor's Luck}\n", "utf8");
    const secondScan = await scanClientLog(fixture.logPath, { cache: fixture.cache });

    expect(firstScan.draws).toHaveLength(0);
    expect(firstScan.pendingDraw?.lineNumber).toBe(1);
    expect(secondScan.scanMode).toBe("incremental");
    expect(secondScan.draws).toHaveLength(1);
    expect(secondScan.draws[0]).toMatchObject({ lineNumber: 1, cardName: "Emperor's Luck" });
  });

  it("does a full rescan when the log is truncated", async () => {
    const fixture = await createFixture(
      [
        "2026/07/07 11:00:00 1 a [INFO Client 1] : Card drawn from the deck: <divination>{The Lover}",
        "2026/07/07 11:00:01 2 a [INFO Client 1] : Card drawn from the deck: <divination>{The Wolf}"
      ].join("\n") + "\n"
    );

    await scanClientLog(fixture.logPath, { cache: fixture.cache });
    await writeFile(
      fixture.logPath,
      "2026/07/07 11:00:02 3 a [INFO Client 1] : Card drawn from the deck: <divination>{The Nurse}\n",
      "utf8"
    );
    const rescan = await scanClientLog(fixture.logPath, { cache: fixture.cache });

    expect(rescan.scanMode).toBe("full");
    expect(rescan.draws.map((draw) => draw.cardName)).toEqual(["The Nurse"]);
  });

  it("does a full rescan when the saved anchor no longer matches", async () => {
    const fixture = await createFixture(
      "2026/07/07 11:00:00 1 a [INFO Client 1] : Card drawn from the deck: <divination>{The Lover}\n"
    );

    await scanClientLog(fixture.logPath, { cache: fixture.cache });
    await writeFile(
      fixture.logPath,
      "2026/07/07 11:00:00 1 a [INFO Client 1] : Card drawn from the deck: <divination>{The Nurse}\n",
      "utf8"
    );
    const rescan = await scanClientLog(fixture.logPath, { cache: fixture.cache });

    expect(rescan.scanMode).toBe("full");
    expect(rescan.draws.map((draw) => draw.cardName)).toEqual(["The Nurse"]);
  });

  it("ignores corrupt cache data", async () => {
    const fixture = await createFixture(
      "2026/07/07 11:00:00 1 a [INFO Client 1] : Card drawn from the deck: <divination>{The Lover}\n"
    );

    await scanClientLog(fixture.logPath, { cache: fixture.cache });
    await writeFile(fixture.cache.snapshotPath(fixture.logPath), "{ \"version\": 999 }\n", "utf8");
    const rescan = await scanClientLog(fixture.logPath, { cache: fixture.cache });

    expect(rescan.scanMode).toBe("full");
    expect(rescan.draws.map((draw) => draw.cardName)).toEqual(["The Lover"]);
  });
});

async function createFixture(logContent: string): Promise<{ cache: LogScanCache; logPath: string }> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "poe-log-scan-"));
  tempDirs.push(dir);
  const logPath = path.join(dir, "Client.txt");

  await writeFile(logPath, logContent, "utf8");

  return {
    cache: new LogScanCache(path.join(dir, "user-data")),
    logPath
  };
}
