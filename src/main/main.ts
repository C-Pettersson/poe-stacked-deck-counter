import { app, BrowserWindow, clipboard, dialog, ipcMain, shell } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHALLENGE_LEAGUES, getLeagueById } from "../shared/leagues.js";
import { buildSessions } from "../shared/sessions.js";
import type { Settings } from "../shared/types.js";
import { scanClientLog } from "./services/logScanner.js";
import { PriceCache } from "./services/priceCache.js";
import { DEFAULT_LOG_PATH, loadSettings, saveSettings } from "./services/settings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

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

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

function registerIpc(): void {
  const userDataPath = app.getPath("userData");
  const priceCache = new PriceCache(userDataPath);

  ipcMain.handle("settings:load", () => loadSettings(userDataPath));

  ipcMain.handle("settings:save", (_event, settings: Settings) => saveSettings(userDataPath, settings));

  ipcMain.handle("dialog:choose-log", async () => {
    const result = await dialog.showOpenDialog({
      title: "Select Path of Exile Client.txt",
      defaultPath: DEFAULT_LOG_PATH,
      properties: ["openFile"],
      filters: [{ name: "Text logs", extensions: ["txt", "log"] }]
    });

    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("log:scan", async (event, filePath: string, settings: Settings) => {
    const result = await scanClientLog(filePath, (progress) => {
      event.sender.send("log:scan-progress", progress);
    });

    return {
      filePath,
      fileSize: result.fileSize,
      scannedAt: new Date().toISOString(),
      draws: result.draws,
      sessions: buildSessions(result.draws, null, settings.sessionLeagueOverrides)
    };
  });

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

  ipcMain.handle("app:open-external", (_event, url: string) => shell.openExternal(url));

  ipcMain.handle("app:leagues", () => CHALLENGE_LEAGUES);
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
