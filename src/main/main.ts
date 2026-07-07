import { app, BrowserWindow, clipboard, dialog, ipcMain, shell } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHALLENGE_LEAGUES, getLeagueById } from "../shared/leagues.js";
import { buildSessions } from "../shared/sessions.js";
import type { ScanResult, Settings } from "../shared/types.js";
import { AutoScanController } from "./services/autoScan.js";
import { LogScanCache } from "./services/logScanCache.js";
import { loadCachedClientLog, scanClientLog, type ClientLogScan } from "./services/logScanner.js";
import { PriceCache } from "./services/priceCache.js";
import { DEFAULT_LOG_PATH, loadSettings, saveSettings } from "./services/settings.js";
import { checkForUpdate, getAppInfo } from "./services/updateCheck.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const externalProtocols = new Set(["http:", "https:"]);

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: "#101417",
    title: "PoE Stacked Deck Counter",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  configureExternalNavigation(mainWindow);

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

function registerIpc(): void {
  const userDataPath = app.getPath("userData");
  const priceCache = new PriceCache(userDataPath);
  const logScanCache = new LogScanCache(userDataPath);
  const autoScanController = new AutoScanController<ScanResult>();

  ipcMain.handle("settings:load", () => loadSettings(userDataPath));

  ipcMain.handle("settings:save", (_event, settings: Settings) => saveSettings(userDataPath, settings));

  ipcMain.handle("dialog:choose-log", async (event) => {
    const options: Electron.OpenDialogOptions = {
      title: "Select Path of Exile Client.txt",
      defaultPath: DEFAULT_LOG_PATH,
      properties: ["openFile"],
      filters: [{ name: "Text logs", extensions: ["txt", "log"] }]
    };
    const browserWindow = BrowserWindow.fromWebContents(event.sender);
    const result = browserWindow
      ? await dialog.showOpenDialog(browserWindow, options)
      : await dialog.showOpenDialog(options);

    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("log:scan", async (event, filePath: string, settings: Settings) => {
    const result = await scanClientLog(filePath, {
      cache: logScanCache,
      onProgress: (progress) => {
        event.sender.send("log:scan-progress", progress);
      }
    });

    return createScanResult(filePath, result, settings);
  });

  ipcMain.handle("log:load-cache", async (_event, filePath: string, settings: Settings) => {
    const result = await loadCachedClientLog(filePath, logScanCache);
    return result ? createScanResult(filePath, result, settings) : null;
  });

  ipcMain.handle("log:auto-scan:configure", (event, filePath: string, settings: Settings) => {
    if (!settings.autoScanEnabled) {
      autoScanController.stop();
      return false;
    }

    const sender = event.sender;
    autoScanController.configure({
      filePath,
      scan: async () => {
        const result = await scanClientLog(filePath, {
          cache: logScanCache,
          onProgress: (progress) => {
            if (!sender.isDestroyed()) {
              sender.send("log:scan-progress", progress);
            }
          }
        });
        return createScanResult(filePath, result, settings);
      },
      onResult: (result) => {
        if (!sender.isDestroyed()) {
          sender.send("log:auto-scan-result", result);
        }
      },
      onError: (message) => {
        if (!sender.isDestroyed()) {
          sender.send("log:auto-scan-error", message);
        }
      }
    });

    return true;
  });

  ipcMain.handle("log:auto-scan:stop", () => {
    autoScanController.stop();
    return true;
  });

  app.on("before-quit", () => autoScanController.stop());

  ipcMain.handle("prices:get", async (_event, leagueId: string, forceRefresh = false) => {
    return priceCache.getPrices(getLeagueById(leagueId), forceRefresh);
  });

  ipcMain.handle("clipboard:write", (_event, text: string) => {
    clipboard.writeText(text);
    return true;
  });

  ipcMain.handle("file:save-text", async (_event, defaultFileName: string, content: string) => {
    const result = await dialog.showSaveDialog({
      title: "Save export",
      defaultPath: defaultFileName,
      filters: [
        { name: "JSON", extensions: ["json"] },
        { name: "CSV", extensions: ["csv"] },
        { name: "Text", extensions: ["txt"] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    await mkdir(path.dirname(result.filePath), { recursive: true });
    await writeFile(result.filePath, content, "utf8");
    return result.filePath;
  });

  ipcMain.handle("app:open-external", (_event, url: string) => openExternalUrl(url));

  ipcMain.handle("app:info", () => getAppInfo(app.getVersion()));

  ipcMain.handle("app:check-update", () => checkForUpdate(app.getVersion()));

  ipcMain.handle("app:leagues", () => CHALLENGE_LEAGUES);
}

function createScanResult(filePath: string, result: ClientLogScan, settings: Settings): ScanResult {
  return {
    filePath,
    fileSize: result.fileSize,
    scannedAt: result.scannedAt,
    scanMode: result.scanMode,
    bytesScanned: result.bytesScanned,
    cachedBytes: result.cachedBytes,
    draws: result.draws,
    sessions: buildSessions(result.draws, null, settings.sessionLeagueOverrides, {
      fixedStackedDeckPriceChaos: settings.fixedStackedDeckPriceChaos,
      pricingLeagueId: settings.selectedLeagueId,
      profitFilters: settings.profitFilters
    })
  };
}

function configureExternalNavigation(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    void openExternalUrl(url).catch(() => undefined);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (!isExternalNavigation(url)) {
      return;
    }

    event.preventDefault();
    void openExternalUrl(url).catch(() => undefined);
  });
}

async function openExternalUrl(url: string): Promise<void> {
  const parsedUrl = new URL(url);

  if (!externalProtocols.has(parsedUrl.protocol)) {
    throw new Error(`Unsupported external URL protocol: ${parsedUrl.protocol}`);
  }

  await shell.openExternal(parsedUrl.toString());
}

function isExternalNavigation(url: string): boolean {
  const parsedUrl = new URL(url);

  if (!externalProtocols.has(parsedUrl.protocol)) {
    return false;
  }

  if (!isDev || !process.env.VITE_DEV_SERVER_URL) {
    return true;
  }

  return parsedUrl.origin !== new URL(process.env.VITE_DEV_SERVER_URL).origin;
}

app.whenReady().then(async () => {
  registerIpc();
  await createWindow();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
