import { mkdtemp, rm, writeFile } from "node:fs/promises";
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

  it("defaults ignored card names to empty", () => {
    expect(defaultSettings().ignoredCardNames).toEqual([]);
  });

  it("defaults session deck price overrides to empty", () => {
    expect(defaultSettings().sessionDeckPriceOverrides).toEqual({});
  });

  it("defaults to hybrid prices with poe.watch priority", () => {
    expect(defaultSettings()).toMatchObject({
      priceSourceMode: "hybrid",
      priceSourcePriority: "poe-watch"
    });
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

  it("round-trips session deck price overrides through persisted settings", async () => {
    const userDataPath = await createTempDir();
    const savedSettings = await saveSettings(userDataPath, {
      ...defaultSettings(),
      sessionDeckPriceOverrides: {
        "session-1": 1.7
      }
    });
    const loadedSettings = await loadSettings(userDataPath);

    expect(savedSettings.sessionDeckPriceOverrides).toEqual({ "session-1": 1.7 });
    expect(loadedSettings.sessionDeckPriceOverrides).toEqual({ "session-1": 1.7 });
  });

  it("round-trips price source settings", async () => {
    const userDataPath = await createTempDir();
    const savedSettings = await saveSettings(userDataPath, {
      ...defaultSettings(),
      priceSourceMode: "poe-ninja",
      priceSourcePriority: "poe-ninja",
      profitFilters: {
        ...defaultSettings().profitFilters,
        confidenceFilter: "low-only"
      }
    });
    const loadedSettings = await loadSettings(userDataPath);

    expect(savedSettings.priceSourceMode).toBe("poe-ninja");
    expect(loadedSettings.priceSourceMode).toBe("poe-ninja");
    expect(loadedSettings.priceSourcePriority).toBe("poe-ninja");
    expect(loadedSettings.profitFilters.confidenceFilter).toBe("low-only");
  });

  it("round-trips ignored card names through persisted settings", async () => {
    const userDataPath = await createTempDir();
    const savedSettings = await saveSettings(userDataPath, {
      ...defaultSettings(),
      ignoredCardNames: ["the watcher"]
    });
    const loadedSettings = await loadSettings(userDataPath);

    expect(savedSettings.ignoredCardNames).toEqual(["the watcher"]);
    expect(loadedSettings.ignoredCardNames).toEqual(["the watcher"]);
  });

  it("normalizes unknown saved league ids", async () => {
    const userDataPath = await createTempDir();
    await writeFile(
      path.join(userDataPath, "settings.json"),
      `${JSON.stringify({
        ...defaultSettings(),
        selectedLeagueId: "missing-league",
        sessionLeagueOverrides: {
          "session-valid": "keepers",
          "session-invalid": "missing-league"
        },
        sessionDeckPriceOverrides: {
          "session-free": 0,
          "session-valid": 1.5,
          "session-invalid-negative": -1,
          "session-invalid-text": "1.2"
        }
      })}\n`,
      "utf8"
    );

    const loadedSettings = await loadSettings(userDataPath);

    expect(loadedSettings.selectedLeagueId).not.toBe("missing-league");
    expect(loadedSettings.sessionLeagueOverrides).toEqual({
      "session-valid": "keepers"
    });
    expect(loadedSettings.sessionDeckPriceOverrides).toEqual({
      "session-free": 0,
      "session-valid": 1.5
    });
  });

  it("normalizes unknown price settings and migrates legacy confidence", async () => {
    const userDataPath = await createTempDir();
    await writeFile(
      path.join(userDataPath, "settings.json"),
      `${JSON.stringify({
        ...defaultSettings(),
        priceSourceMode: "missing-source",
        priceSourcePriority: "missing-priority",
        profitFilters: {
          minimumCardValueChaos: 0,
          minimumStackValueChaos: 0,
          requireConfidence: true
        }
      })}\n`,
      "utf8"
    );

    const loadedSettings = await loadSettings(userDataPath);

    expect(loadedSettings.priceSourceMode).toBe("hybrid");
    expect(loadedSettings.priceSourcePriority).toBe("poe-watch");
    expect(loadedSettings.profitFilters.confidenceFilter).toBe("high-only");
  });

  it("normalizes ignored card names", async () => {
    const userDataPath = await createTempDir();
    await writeFile(
      path.join(userDataPath, "settings.json"),
      `${JSON.stringify({
        ...defaultSettings(),
        ignoredCardNames: ["The Watcher", " the   watcher ", "The Doctor", 42, ""]
      })}\n`,
      "utf8"
    );

    const loadedSettings = await loadSettings(userDataPath);

    expect(loadedSettings.ignoredCardNames).toEqual(["the doctor", "the watcher"]);
  });
});

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "poe-settings-"));
  tempDirs.push(dir);
  return dir;
}
