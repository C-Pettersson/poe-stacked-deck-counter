import type { LeagueInfo, PriceSnapshot, ScanProgress, ScanResult, Settings } from "../shared/types.js";

declare global {
  interface Window {
    poeDeck: {
      loadSettings: () => Promise<Settings>;
      saveSettings: (settings: Settings) => Promise<Settings>;
      chooseLogFile: () => Promise<string | null>;
      scanLog: (filePath: string, settings: Settings) => Promise<ScanResult>;
      getPrices: (leagueId: string, forceRefresh?: boolean) => Promise<PriceSnapshot>;
      copyText: (text: string) => Promise<boolean>;
      saveTextFile: (defaultFileName: string, content: string) => Promise<string | null>;
      openExternal: (url: string) => Promise<void>;
      getLeagues: () => Promise<LeagueInfo[]>;
      onScanProgress: (listener: (progress: ScanProgress) => void) => () => void;
    };
  }
}

export {};
