import { contextBridge, ipcRenderer } from "electron";
import type {
  AppInfo,
  AppUpdateInfo,
  LeagueInfo,
  PriceSnapshot,
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
  getPrices: (leagueId: string, forceRefresh = false): Promise<PriceSnapshot> =>
    ipcRenderer.invoke("prices:get", leagueId, forceRefresh),
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
  }
};

contextBridge.exposeInMainWorld("poeDeck", api);
