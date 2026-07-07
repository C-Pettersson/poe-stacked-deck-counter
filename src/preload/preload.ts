import { contextBridge, ipcRenderer } from "electron";
import type {
  AppInfo,
  AppUpdateInfo,
  LeagueInfo,
  PriceSnapshot,
  PriceSourceOptions,
  ScanProgress,
  ScanResult,
  Settings
} from "../shared/types.js";

const api = {
  loadSettings: (): Promise<Settings> => ipcRenderer.invoke("settings:load"),
  saveSettings: (settings: Settings): Promise<Settings> => ipcRenderer.invoke("settings:save", settings),
  chooseLogFile: (): Promise<string | null> => ipcRenderer.invoke("dialog:choose-log"),
  scanLog: (filePath: string, settings: Settings): Promise<ScanResult> =>
    ipcRenderer.invoke("log:scan", filePath, settings),
  loadCachedScan: (filePath: string, settings: Settings): Promise<ScanResult | null> =>
    ipcRenderer.invoke("log:load-cache", filePath, settings),
  configureAutoScan: (filePath: string, settings: Settings): Promise<boolean> =>
    ipcRenderer.invoke("log:auto-scan:configure", filePath, settings),
  stopAutoScan: (): Promise<boolean> => ipcRenderer.invoke("log:auto-scan:stop"),
  getPrices: (leagueId: string, options: PriceSourceOptions, forceRefresh = false): Promise<PriceSnapshot> =>
    ipcRenderer.invoke("prices:get", leagueId, options, forceRefresh),
  clearPriceCache: (): Promise<boolean> => ipcRenderer.invoke("prices:clear-cache"),
  copyText: (text: string): Promise<boolean> => ipcRenderer.invoke("clipboard:write", text),
  saveTextFile: (defaultFileName: string, content: string): Promise<string | null> =>
    ipcRenderer.invoke("file:save-text", defaultFileName, content),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke("app:open-external", url),
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke("app:info"),
  checkForUpdate: (): Promise<AppUpdateInfo> => ipcRenderer.invoke("app:check-update"),
  getLeagues: (): Promise<LeagueInfo[]> => ipcRenderer.invoke("app:leagues"),
  onScanProgress: (listener: (progress: ScanProgress) => void): (() => void) => {
    const channelListener = (_event: Electron.IpcRendererEvent, progress: ScanProgress): void => listener(progress);
    ipcRenderer.on("log:scan-progress", channelListener);
    return () => ipcRenderer.removeListener("log:scan-progress", channelListener);
  },
  onAutoScanResult: (listener: (result: ScanResult) => void): (() => void) => {
    const channelListener = (_event: Electron.IpcRendererEvent, result: ScanResult): void => listener(result);
    ipcRenderer.on("log:auto-scan-result", channelListener);
    return () => ipcRenderer.removeListener("log:auto-scan-result", channelListener);
  },
  onAutoScanError: (listener: (message: string) => void): (() => void) => {
    const channelListener = (_event: Electron.IpcRendererEvent, message: string): void => listener(message);
    ipcRenderer.on("log:auto-scan-error", channelListener);
    return () => ipcRenderer.removeListener("log:auto-scan-error", channelListener);
  }
};

contextBridge.exposeInMainWorld("poeDeck", api);
