import type { CatalogSnapshot, CollectionRun } from "../../domain/collection.js";
import type { ScanProgress } from "../../shared/types.js";
import type { MarketPriceDataset } from "../../domain/marketPricing.js";
import type { ClientLogScan } from "../services/logScanner.js";

export type CollectorWorkerRequest =
  | { id: string; type: "scan"; filePath: string }
  | { id: string; type: "load-cached-scan"; filePath: string }
  | { id: string; type: "list-runs"; includeArchived: boolean }
  | { id: string; type: "save-run"; run: CollectionRun }
  | { id: string; type: "read-catalog" }
  | { id: string; type: "write-catalog"; snapshot: CatalogSnapshot }
  | { id: string; type: "read-price-dataset"; cacheKey: string }
  | { id: string; type: "write-price-dataset"; dataset: MarketPriceDataset };

export type CollectorWorkerCommand = CollectorWorkerRequest extends infer Request
  ? Request extends { id: string }
    ? Omit<Request, "id">
    : never
  : never;

export type CollectorWorkerResult =
  | ClientLogScan
  | ClientLogScan[]
  | CollectionRun
  | CollectionRun[]
  | CatalogSnapshot
  | MarketPriceDataset
  | null
  | true;

export type CollectorWorkerMessage =
  | { kind: "result"; id: string; value: CollectorWorkerResult }
  | { kind: "error"; id: string; message: string }
  | { kind: "progress"; id: string; progress: ScanProgress };
