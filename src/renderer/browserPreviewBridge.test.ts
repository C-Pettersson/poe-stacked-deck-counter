import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PROFIT_FILTERS } from "../shared/profitFilters.js";
import type { ScanResult, Settings } from "../shared/types.js";
import { installBrowserPreviewBridge } from "./browserPreviewBridge.js";

const settings: Settings = {
  logPath: "Client.txt",
  selectedLeagueId: "mirage",
  currencyMode: "auto",
  autoScanEnabled: true,
  fixedStackedDeckPriceChaos: 5,
  profitFilters: DEFAULT_PROFIT_FILTERS,
  sessionLeagueOverrides: {}
};

const apiScanResult: ScanResult = {
  filePath: "Client.txt",
  fileSize: 1234,
  scannedAt: "2026-07-07T21:00:00.000Z",
  scanMode: "cached",
  bytesScanned: 0,
  cachedBytes: 1234,
  draws: [
    {
      id: "draw-1",
      lineNumber: 1,
      timestamp: "2026-07-07T18:00:00.000Z",
      cardName: "The Doctor"
    },
    {
      id: "draw-2",
      lineNumber: 2,
      timestamp: "2026-07-07T18:00:01.000Z",
      cardName: "The Nurse"
    },
    {
      id: "draw-3",
      lineNumber: 3,
      timestamp: "2026-07-07T18:00:02.000Z",
      cardName: "The Hoarder"
    }
  ],
  sessions: []
};

describe("browser preview bridge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", createWindowStub());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("uses the preview scan API for automatic scan results", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(apiScanResult));
    vi.stubGlobal("fetch", fetchMock);
    installBrowserPreviewBridge();

    const emittedResults: ScanResult[] = [];
    const unsubscribe = window.poeDeck.onAutoScanResult((result) => emittedResults.push(result));

    await window.poeDeck.configureAutoScan("Client.txt", settings);
    await vi.advanceTimersByTimeAsync(300);
    await vi.waitFor(() => expect(emittedResults).toHaveLength(1));

    expect(fetchMock).toHaveBeenCalledWith(
      "/__poe-preview/scan",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ filePath: "Client.txt", settings })
      })
    );
    expect(emittedResults[0].draws).toHaveLength(3);

    unsubscribe();
  });
});

function createWindowStub(): Window & typeof globalThis {
  return {
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis)
  } as unknown as Window & typeof globalThis;
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json"
    }
  });
}
