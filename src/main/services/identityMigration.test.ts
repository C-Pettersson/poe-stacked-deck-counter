import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { migrateLegacyIdentity } from "./identityMigration.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("identity migration", () => {
  it("copies legacy settings once without modifying the source", async () => {
    const appData = await temporaryDirectory();
    const legacy = path.join(appData, "PoE Stacked Deck Counter");
    const current = path.join(appData, "Wraeclast Field Notes");
    await mkdir(legacy);
    await writeFile(path.join(legacy, "settings.json"), "{\"logPath\":\"legacy\"}", "utf8");

    expect(await migrateLegacyIdentity(appData, current)).toMatchObject({ status: "imported", sourcePath: legacy });
    expect(await readFile(path.join(current, "settings.json"), "utf8")).toContain("legacy");
    expect(await readFile(path.join(legacy, "settings.json"), "utf8")).toContain("legacy");
    expect(await migrateLegacyIdentity(appData, current)).toEqual({ status: "already-checked" });
  });

  it("does not merge when the new identity already has data", async () => {
    const appData = await temporaryDirectory();
    const legacy = path.join(appData, "poe-stacked-deck-counter");
    const current = path.join(appData, "Wraeclast Field Notes");
    await mkdir(legacy);
    await mkdir(current);
    await writeFile(path.join(legacy, "settings.json"), "legacy", "utf8");
    await writeFile(path.join(current, "settings.json"), "current", "utf8");

    expect(await migrateLegacyIdentity(appData, current)).toEqual({ status: "new-data-present" });
    expect(await readFile(path.join(current, "settings.json"), "utf8")).toBe("current");
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "field-notes-migration-"));
  directories.push(directory);
  return directory;
}
