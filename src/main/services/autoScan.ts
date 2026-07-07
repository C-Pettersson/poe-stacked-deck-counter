import { watch, type FSWatcher } from "node:fs";

interface AutoScanConfig<T> {
  filePath: string;
  scan: () => Promise<T>;
  onResult: (result: T) => void;
  onError: (message: string) => void;
}

const AUTO_SCAN_DEBOUNCE_MS = 500;

export class AutoScanController<T> {
  private watcher: FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private config: AutoScanConfig<T> | null = null;
  private isScanning = false;
  private queued = false;

  configure(config: AutoScanConfig<T> | null): void {
    this.stop();

    if (!config) {
      return;
    }

    this.config = config;

    try {
      this.watcher = watch(config.filePath, () => this.scheduleScan());
      this.watcher.on("error", (error) => config.onError(error.message));
    } catch (error) {
      config.onError(error instanceof Error ? error.message : "Automatic scan watcher failed.");
    }

    this.scheduleScan(0);
  }

  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    this.config = null;
    this.queued = false;
  }

  private scheduleScan(delayMs = AUTO_SCAN_DEBOUNCE_MS): void {
    if (!this.config) {
      return;
    }

    if (this.isScanning) {
      this.queued = true;
      return;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.runScan();
    }, delayMs);
  }

  private async runScan(): Promise<void> {
    const scanConfig = this.config;

    if (!scanConfig || this.isScanning) {
      return;
    }

    this.isScanning = true;

    try {
      const result = await scanConfig.scan();

      if (this.config === scanConfig) {
        scanConfig.onResult(result);
      }
    } catch (error) {
      if (this.config === scanConfig) {
        scanConfig.onError(error instanceof Error ? error.message : "Automatic scan failed.");
      }
    } finally {
      this.isScanning = false;

      if (this.config && this.queued) {
        this.queued = false;
        this.scheduleScan();
      }
    }
  }
}
