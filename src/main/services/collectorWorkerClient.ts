import { Worker } from "node:worker_threads";
import type { CatalogSnapshot, CollectionRun } from "../../domain/collection.js";
import type { ScanProgress } from "../../shared/types.js";
import type { MarketPriceDataset } from "../../domain/marketPricing.js";
import type { ClientLogScan } from "./logScanner.js";
import type {
  CollectorWorkerMessage,
  CollectorWorkerCommand,
  CollectorWorkerRequest,
  CollectorWorkerResult
} from "../workers/collectorWorkerProtocol.js";

interface PendingRequest {
  resolve: (value: CollectorWorkerResult) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: ScanProgress) => void;
  timeout: NodeJS.Timeout;
}

const REQUEST_TIMEOUT_MS = 10 * 60 * 1000;

export class CollectorWorkerClient {
  private readonly worker: Worker;
  private readonly pending = new Map<string, PendingRequest>();

  constructor(userDataPath: string) {
    this.worker = new Worker(new URL("../workers/collectorWorker.js", import.meta.url), {
      workerData: { userDataPath }
    });
    this.worker.on("message", (message: CollectorWorkerMessage) => this.onMessage(message));
    this.worker.on("error", (error) => this.rejectAll(error));
    this.worker.on("exit", (code) => {
      if (code !== 0) {
        this.rejectAll(new Error(`Collector worker exited with code ${code}.`));
      }
    });
  }

  scan(filePath: string, onProgress?: (progress: ScanProgress) => void): Promise<ClientLogScan> {
    return this.request<ClientLogScan>({ type: "scan", filePath }, onProgress);
  }

  loadCachedScan(filePath: string): Promise<ClientLogScan | null> {
    return this.request<ClientLogScan | null>({ type: "load-cached-scan", filePath });
  }

  listRuns(includeArchived = false): Promise<CollectionRun[]> {
    return this.request<CollectionRun[]>({ type: "list-runs", includeArchived });
  }

  saveRun(run: CollectionRun): Promise<CollectionRun> {
    return this.request<CollectionRun>({ type: "save-run", run });
  }

  readCatalog(): Promise<CatalogSnapshot | null> {
    return this.request<CatalogSnapshot | null>({ type: "read-catalog" });
  }

  async writeCatalog(snapshot: CatalogSnapshot): Promise<void> {
    await this.request<true>({ type: "write-catalog", snapshot });
  }

  readPriceDataset(cacheKey: string): Promise<MarketPriceDataset | null> {
    return this.request<MarketPriceDataset | null>({ type: "read-price-dataset", cacheKey });
  }

  async writePriceDataset(dataset: MarketPriceDataset): Promise<void> {
    await this.request<true>({ type: "write-price-dataset", dataset });
  }

  async close(): Promise<void> {
    this.rejectAll(new Error("Collector worker stopped."));
    await this.worker.terminate();
  }

  private request<T extends CollectorWorkerResult>(
    request: CollectorWorkerCommand,
    onProgress?: (progress: ScanProgress) => void
  ): Promise<T> {
    const id = globalThis.crypto.randomUUID();

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("Collector worker request timed out."));
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(id, {
        resolve: resolve as (value: CollectorWorkerResult) => void,
        reject,
        onProgress,
        timeout
      });
      this.worker.postMessage({ ...request, id });
    });
  }

  private onMessage(message: CollectorWorkerMessage): void {
    const pending = this.pending.get(message.id);
    if (!pending) {
      return;
    }

    if (message.kind === "progress") {
      pending.onProgress?.(message.progress);
      return;
    }

    clearTimeout(pending.timeout);
    this.pending.delete(message.id);

    if (message.kind === "error") {
      pending.reject(new Error(message.message));
      return;
    }

    pending.resolve(message.value);
  }

  private rejectAll(error: Error): void {
    for (const request of this.pending.values()) {
      clearTimeout(request.timeout);
      request.reject(error);
    }
    this.pending.clear();
  }
}
