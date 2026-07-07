import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { defaultSettings, loadSettings, saveSettings } from "./settings.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("settings", () => {
  it("defaults automatic scanning to disabled", () => {
    expect(defaultSettings().autoScanEnabled).toBe(false);
  });

  it("defaults fixed stacked deck pricing to automatic", () => {
    expect(defaultSettings().fixedStackedDeckPriceChaos).toBeNull();
  });

  it("round-trips automatic scanning through persisted settings", async () => {
    const userDataPath = await createTempDir();
    const savedSettings = await saveSettings(userDataPath, {
      ...defaultSettings(),
      autoScanEnabled: true
    });
    const loadedSettings = await loadSettings(userDataPath);

    expect(savedSettings.autoScanEnabled).toBe(true);
    expect(loadedSettings.autoScanEnabled).toBe(true);
  });

  it("round-trips a fixed stacked deck price through persisted settings", async () => {
    const userDataPath = await createTempDir();
    const savedSettings = await saveSettings(userDataPath, {
      ...defaultSettings(),
      fixedStackedDeckPriceChaos: 1.7
    });
    const loadedSettings = await loadSettings(userDataPath);

    expect(savedSettings.fixedStackedDeckPriceChaos).toBe(1.7);
    expect(loadedSettings.fixedStackedDeckPriceChaos).toBe(1.7);
  });
});

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "poe-settings-"));
  tempDirs.push(dir);
  return dir;
}
