import { createHash } from "node:crypto";
import { mkdir, open, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ClientLogDraw, ClientLogEncounter } from "../../shared/types.js";
import type { EncounterDetectorState } from "../../features/events/clientLogEncounterDetector.js";

export interface CachedPendingDraw {
  timestamp: string;
  lineNumber: number;
}

export interface LogScanAnchor {
  start: number;
  byteLength: number;
  sha256: string;
}

export interface LogScanSnapshot {
  version: 1;
  filePath: string;
  normalizedPath: string;
  fileSize: number;
  linesRead: number;
  scannedAt: string;
  draws: ClientLogDraw[];
  pendingDraw: CachedPendingDraw | null;
  encounters: ClientLogEncounter[];
  encounterState: EncounterDetectorState;
  anchor: LogScanAnchor | null;
}

export interface LogScanCachePort {
  read(filePath: string): Promise<LogScanSnapshot | null>;
  write(snapshot: Omit<LogScanSnapshot, "version" | "normalizedPath" | "anchor">): Promise<LogScanSnapshot>;
  matchesAnchor(filePath: string, snapshot: LogScanSnapshot): Promise<boolean>;
}

const CACHE_VERSION = 1;
const ANCHOR_BYTES = 4096;

export class LogScanCache implements LogScanCachePort {
  private readonly cacheDir: string;

  constructor(userDataPath: string) {
    this.cacheDir = path.join(userDataPath, "log-scan-cache");
  }

  async read(filePath: string): Promise<LogScanSnapshot | null> {
    try {
      const raw = await readFile(this.snapshotPath(filePath), "utf8");
      const parsed = JSON.parse(raw) as unknown;
      return normalizeSnapshot(parsed, filePath);
    } catch {
      return null;
    }
  }

  async write(snapshot: Omit<LogScanSnapshot, "version" | "normalizedPath" | "anchor">): Promise<LogScanSnapshot> {
    const nextSnapshot: LogScanSnapshot = {
      ...snapshot,
      version: CACHE_VERSION,
      normalizedPath: normalizeLogPath(snapshot.filePath),
      anchor: await createAnchor(snapshot.filePath, snapshot.fileSize)
    };

    await mkdir(this.cacheDir, { recursive: true });
    await writeFile(this.snapshotPath(snapshot.filePath), `${JSON.stringify(nextSnapshot, null, 2)}\n`, "utf8");
    return nextSnapshot;
  }

  async matchesAnchor(filePath: string, snapshot: LogScanSnapshot): Promise<boolean> {
    if (snapshot.fileSize === 0) {
      return true;
    }

    if (!snapshot.anchor) {
      return false;
    }

    const currentAnchor = await readAnchorAt(filePath, snapshot.anchor.start, snapshot.anchor.byteLength);
    return currentAnchor?.sha256 === snapshot.anchor.sha256;
  }

  snapshotPath(filePath: string): string {
    return path.join(this.cacheDir, `${hashPath(normalizeLogPath(filePath))}.json`);
  }
}

export function normalizeLogPath(filePath: string): string {
  const normalizedPath = path.normalize(path.resolve(filePath));
  return process.platform === "win32" ? normalizedPath.toLowerCase() : normalizedPath;
}

async function createAnchor(filePath: string, fileSize: number): Promise<LogScanAnchor | null> {
  if (fileSize === 0) {
    return null;
  }

  const byteLength = Math.min(ANCHOR_BYTES, fileSize);
  const start = fileSize - byteLength;
  return readAnchorAt(filePath, start, byteLength);
}

async function readAnchorAt(filePath: string, start: number, byteLength: number): Promise<LogScanAnchor | null> {
  const file = await open(filePath, "r");

  try {
    const buffer = Buffer.alloc(byteLength);
    const { bytesRead } = await file.read(buffer, 0, byteLength, start);

    if (bytesRead !== byteLength) {
      return null;
    }

    return {
      start,
      byteLength,
      sha256: createHash("sha256").update(buffer).digest("hex")
    };
  } finally {
    await file.close();
  }
}

function normalizeSnapshot(payload: unknown, filePath: string): LogScanSnapshot | null {
  if (!isSnapshotLike(payload)) {
    return null;
  }

  const normalizedPath = normalizeLogPath(filePath);
  if (payload.normalizedPath !== normalizedPath) {
    return null;
  }

  return {
    ...payload,
    encounters: Array.isArray(payload.encounters) ? payload.encounters : [],
    encounterState: isEncounterState(payload.encounterState)
      ? payload.encounterState
      : { pendingArea: null, activeEncounter: null }
  };
}

function isEncounterState(value: unknown): value is EncounterDetectorState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<EncounterDetectorState>;
  return (state.pendingArea === null || typeof state.pendingArea === "object") &&
    (state.activeEncounter === null || typeof state.activeEncounter === "object");
}

function isSnapshotLike(payload: unknown): payload is LogScanSnapshot {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const snapshot = payload as Partial<LogScanSnapshot>;
  const fileSize = snapshot.fileSize;
  const linesRead = snapshot.linesRead;

  return (
    snapshot.version === CACHE_VERSION &&
    typeof snapshot.filePath === "string" &&
    typeof snapshot.normalizedPath === "string" &&
    typeof fileSize === "number" &&
    Number.isInteger(fileSize) &&
    fileSize >= 0 &&
    typeof linesRead === "number" &&
    Number.isInteger(linesRead) &&
    linesRead >= 0 &&
    typeof snapshot.scannedAt === "string" &&
    Array.isArray(snapshot.draws) &&
    isPendingDraw(snapshot.pendingDraw) &&
    isAnchor(snapshot.anchor)
  );
}

function isPendingDraw(value: unknown): value is CachedPendingDraw | null {
  if (value === null) {
    return true;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const pendingDraw = value as Partial<CachedPendingDraw>;
  return typeof pendingDraw.timestamp === "string" && Number.isInteger(pendingDraw.lineNumber);
}

function isAnchor(value: unknown): value is LogScanAnchor | null {
  if (value === null) {
    return true;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const anchor = value as Partial<LogScanAnchor>;
  const start = anchor.start;
  const byteLength = anchor.byteLength;
  return (
    typeof start === "number" &&
    Number.isInteger(start) &&
    start >= 0 &&
    typeof byteLength === "number" &&
    Number.isInteger(byteLength) &&
    byteLength > 0 &&
    typeof anchor.sha256 === "string"
  );
}

function hashPath(normalizedPath: string): string {
  return createHash("sha256").update(normalizedPath).digest("hex");
}
