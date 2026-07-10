import { parentPort, workerData } from "node:worker_threads";
import { CollectorDatabase, importLegacyLogCache, SqliteLogScanCache } from "../services/collectorDatabase.js";
import { loadCachedClientLog, scanClientLog } from "../services/logScanner.js";
import type { CollectorWorkerMessage, CollectorWorkerRequest, CollectorWorkerResult } from "./collectorWorkerProtocol.js";

interface CollectorWorkerData {
  userDataPath: string;
}

if (!parentPort) {
  throw new Error("Collector worker must run inside a worker thread.");
}

const port = parentPort;
const data = workerData as CollectorWorkerData;
const database = new CollectorDatabase(data.userDataPath);
const scanCache = new SqliteLogScanCache(database);
await importLegacyLogCache(data.userDataPath, database);

port.on("message", (request: CollectorWorkerRequest) => {
  void handleRequest(request);
});

port.on("close", () => database.close());

async function handleRequest(request: CollectorWorkerRequest): Promise<void> {
  try {
    const value = await executeRequest(request);
    post({ kind: "result", id: request.id, value });
  } catch (error) {
    post({
      kind: "error",
      id: request.id,
      message: error instanceof Error ? error.message : "Collector worker request failed."
    });
  }
}

async function executeRequest(request: CollectorWorkerRequest): Promise<CollectorWorkerResult> {
  switch (request.type) {
    case "scan":
      return scanClientLog(request.filePath, {
        cache: scanCache,
        onProgress: (progress) => post({ kind: "progress", id: request.id, progress })
      });
    case "load-cached-scan":
      return loadCachedClientLog(request.filePath, scanCache);
    case "list-runs":
      return database.listRuns(request.includeArchived);
    case "save-run":
      return database.saveRun(request.run);
    case "read-catalog":
      return database.readCatalog();
    case "write-catalog":
      database.writeCatalog(request.snapshot);
      return true;
    case "read-price-dataset":
      return database.readPriceDataset(request.cacheKey);
    case "write-price-dataset":
      database.writePriceDataset(request.dataset);
      return true;
  }
}

function post(message: CollectorWorkerMessage): void {
  port.postMessage(message);
}
