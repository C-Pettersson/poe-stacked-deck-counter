import { app, BrowserWindow, clipboard, dialog, ipcMain, Notification, shell } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHALLENGE_LEAGUES, getLeagueById } from "../shared/leagues.js";
import { normalizePriceSourceOptions } from "../shared/priceSources.js";
import { projectStackedDeckSessions } from "../features/stackedDeck/sessionProjector.js";
import type { CollectionRun } from "../domain/collection.js";
import type { MarketPriceRequest } from "../domain/marketPricing.js";
import type { ScanResult, Settings } from "../shared/types.js";
import { AutoScanController } from "./services/autoScan.js";
import {
  collectionRunSchema,
  validateItemSearch,
  validateLogPath,
  validateMarketPriceRequest,
  validateSettings,
  validateExportFileName,
  validateExportText
} from "./ipcValidation.js";
import { CollectorWorkerClient } from "./services/collectorWorkerClient.js";
import type { ClientLogScan } from "./services/logScanner.js";
import { migrateLegacyIdentity } from "./services/identityMigration.js";
import { MarketPriceService } from "./services/marketPrices.js";
import { PoeHowCatalogService } from "./services/poeHowCatalog.js";
import { PriceCache } from "./services/priceCache.js";
import { DEFAULT_LOG_PATH, loadSettings, saveSettings } from "./services/settings.js";
import { checkForUpdate, getAppInfo } from "./services/updateCheck.js";
import {
  EncounterNotificationTracker,
  type EncounterNotificationMessage
} from "./services/encounterNotifications.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const externalProtocols = new Set(["https:"]);
const externalHosts = new Set([
  "poe.how",
  "github.com",
  "www.poewiki.net",
  "poewiki.net",
  "poedb.tw",
  "poe.ninja",
  "api.poe.watch"
]);

app.setName("Wraeclast Field Notes");
app.setPath("userData", resolveUserDataPath());

let mainWindow: BrowserWindow | null = null;
let collectorWorker: CollectorWorkerClient | null = null;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: "#101417",
    title: "Wraeclast Field Notes",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  configureExternalNavigation(mainWindow);

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

async function registerIpc(): Promise<void> {
  const userDataPath = app.getPath("userData");
  const migrationAppDataPath = process.env.WRAECLAST_FIELD_NOTES_USER_DATA
    ? path.dirname(userDataPath)
    : app.getPath("appData");
  await migrateLegacyIdentity(migrationAppDataPath, userDataPath);
  const priceCache = new PriceCache(userDataPath, app.getVersion());
  collectorWorker = new CollectorWorkerClient(userDataPath);
  const worker = collectorWorker;
  const catalogService = new PoeHowCatalogService(
    {
      readCatalog: () => worker.readCatalog(),
      writeCatalog: (snapshot) => worker.writeCatalog(snapshot)
    },
    app.getVersion()
  );
  const marketPriceService = new MarketPriceService(
    {
      readPriceDataset: (cacheKey) => worker.readPriceDataset(cacheKey),
      writePriceDataset: (dataset) => worker.writePriceDataset(dataset)
    },
    app.getVersion()
  );
  const autoScanController = new AutoScanController<ScanResult>();
  const encounterNotificationTracker = new EncounterNotificationTracker();

  ipcMain.handle("settings:load", () => loadSettings(userDataPath));

  ipcMain.handle("settings:save", (_event, settings: Settings) => saveSettings(userDataPath, validateSettings(settings)));

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
    const safeFilePath = validateLogPath(filePath);
    const safeSettings = validateSettings(settings);
    const result = await worker.scan(safeFilePath, (progress) => {
        event.sender.send("log:scan-progress", progress);
    });

    return createScanResult(safeFilePath, result, safeSettings);
  });

  ipcMain.handle("log:load-cache", async (_event, filePath: string, settings: Settings) => {
    const safeFilePath = validateLogPath(filePath);
    const safeSettings = validateSettings(settings);
    const result = await worker.loadCachedScan(safeFilePath);
    return result ? createScanResult(safeFilePath, result, safeSettings) : null;
  });

  ipcMain.handle("log:auto-scan:configure", (event, filePath: string, settings: Settings) => {
    const safeSettings = validateSettings(settings);
    encounterNotificationTracker.reset();
    if (!safeSettings.autoScanEnabled) {
      autoScanController.stop();
      return false;
    }

    const sender = event.sender;
    const safeFilePath = validateLogPath(filePath);
    autoScanController.configure({
      filePath: safeFilePath,
      scan: async () => {
        const result = await worker.scan(safeFilePath, (progress) => {
            if (!sender.isDestroyed()) {
              sender.send("log:scan-progress", progress);
            }
        });
        return createScanResult(safeFilePath, result, safeSettings);
      },
      onResult: (result) => {
        for (const message of encounterNotificationTracker.accept(result, safeSettings.encounterNotifications)) {
          showEncounterNotification(message);
        }
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
    encounterNotificationTracker.reset();
    return true;
  });

  app.on("before-quit", () => {
    autoScanController.stop();
    void worker.close();
  });

  ipcMain.handle("catalog:get", (_event, forceRefresh = false) => catalogService.getCatalog(forceRefresh === true));
  ipcMain.handle("catalog:search-items", (_event, query: string) => catalogService.searchItems(validateItemSearch(query)));
  ipcMain.handle("runs:list", (_event, includeArchived = false) => worker.listRuns(includeArchived === true));
  ipcMain.handle("runs:save", (_event, run: CollectionRun) => worker.saveRun(collectionRunSchema.parse(run)));
  ipcMain.handle("prices:market-quotes", (_event, request: MarketPriceRequest) =>
    marketPriceService.getQuotes(validateMarketPriceRequest(request))
  );

  ipcMain.handle("prices:get", async (_event, leagueId: string, options: unknown, forceRefresh = false) => {
    return priceCache.getPrices(getLeagueById(leagueId), normalizePriceSourceOptions(options), forceRefresh);
  });

  ipcMain.handle("prices:clear-cache", async () => {
    await priceCache.clear();
    return true;
  });

  ipcMain.handle("clipboard:write", (_event, text: string) => {
    clipboard.writeText(validateExportText(text));
    return true;
  });

  ipcMain.handle("file:save-text", async (_event, defaultFileName: string, content: string) => {
    const safeDefaultFileName = validateExportFileName(defaultFileName);
    const safeContent = validateExportText(content);
    const result = await dialog.showSaveDialog({
      title: "Save export",
      defaultPath: safeDefaultFileName,
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
    await writeFile(result.filePath, safeContent, "utf8");
    return result.filePath;
  });

  ipcMain.handle("app:open-external", (_event, url: string) => openExternalUrl(url));

  ipcMain.handle("app:info", () => getAppInfo(app.getVersion()));

  ipcMain.handle("app:check-update", () => checkForUpdate(app.getVersion()));

  ipcMain.handle("app:leagues", () => CHALLENGE_LEAGUES);
}

function showEncounterNotification(message: EncounterNotificationMessage): void {
  if (!Notification.isSupported()) return;

  const notification = new Notification({
    title: message.title,
    body: message.body,
    silent: !message.sound
  });
  notification.once("click", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
  notification.show();
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
    encounters: result.encounters,
    activeEncounter: result.activeEncounter,
    sessions: projectStackedDeckSessions(result.draws, null, settings.sessionLeagueOverrides, {
      fixedStackedDeckPriceChaos: settings.fixedStackedDeckPriceChaos,
      pricingLeagueId: settings.selectedLeagueId,
      profitFilters: settings.profitFilters,
      ignoredCardNames: settings.ignoredCardNames,
      sessionDeckPriceOverrides: settings.sessionDeckPriceOverrides
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

  if (!externalProtocols.has(parsedUrl.protocol) || !externalHosts.has(parsedUrl.hostname.toLowerCase())) {
    throw new Error(`Unsupported external URL: ${parsedUrl.origin}`);
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

function resolveUserDataPath(): string {
  const override = process.env.WRAECLAST_FIELD_NOTES_USER_DATA?.trim();
  if (!override) {
    return path.join(app.getPath("appData"), "Wraeclast Field Notes");
  }
  if (!path.isAbsolute(override)) {
    throw new Error("WRAECLAST_FIELD_NOTES_USER_DATA must be an absolute path.");
  }
  return path.normalize(override);
}

if (process.platform === "win32") {
  app.setAppUserModelId("how.poe.fieldnotes");
}

app.whenReady().then(async () => {
  await registerIpc();
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
