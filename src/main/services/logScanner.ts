import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { parseCardNameFromLine, parseTimestampFromLogLine, CARD_DRAW_MARKER } from "../../shared/clientLog.js";
import type { ActiveClientLogEncounter, ClientLogDraw, ClientLogEncounter, ScanMode, ScanProgress } from "../../shared/types.js";
import {
  createEncounterDetectorState,
  detectEncounterLogLine,
  type EncounterDetectorState
} from "../../features/events/clientLogEncounterDetector.js";
import type { CachedPendingDraw, LogScanCachePort, LogScanSnapshot } from "./logScanCache.js";

interface ScanClientLogOptions {
  cache?: LogScanCachePort;
  onProgress?: (progress: ScanProgress) => void;
}

export interface ClientLogScan {
  fileSize: number;
  linesRead: number;
  scannedAt: string;
  scanMode: ScanMode;
  bytesScanned: number;
  cachedBytes: number;
  draws: ClientLogDraw[];
  pendingDraw: CachedPendingDraw | null;
  encounters: ClientLogEncounter[];
  activeEncounter: ActiveClientLogEncounter | null;
  encounterState: EncounterDetectorState;
}

interface ScanStreamOptions {
  fileSize: number;
  startByte: number;
  initialLinesRead: number;
  initialDraws: ClientLogDraw[];
  initialPendingDraw: CachedPendingDraw | null;
  initialEncounters: ClientLogEncounter[];
  initialEncounterState: EncounterDetectorState;
  scanMode: Extract<ScanMode, "full" | "incremental">;
  onProgress?: (progress: ScanProgress) => void;
}

const READ_STREAM_HIGH_WATER_MARK = 1024 * 1024;
const PROGRESS_INTERVAL_MS = 250;

export async function scanClientLog(filePath: string, options: ScanClientLogOptions = {}): Promise<ClientLogScan> {
  const cache = options.cache;
  const fileStats = await stat(filePath);
  const cached = cache ? await cache.read(filePath) : null;
  const cachedIsUsable = cached && cache ? await canResumeFromCache(filePath, fileStats.size, cached, cache) : false;

  if (cached && cachedIsUsable && cached.fileSize === fileStats.size) {
    const result = createCachedScan(cached);
    options.onProgress?.({
      bytesRead: result.fileSize,
      totalBytes: result.fileSize,
      linesRead: result.linesRead,
      drawsFound: result.draws.length,
      cachedBytes: result.cachedBytes,
      scanMode: result.scanMode
    });
    return result;
  }

  const shouldIncrement = cached && cachedIsUsable && cached.fileSize < fileStats.size;
  const streamResult = await scanClientLogStream(filePath, {
    fileSize: fileStats.size,
    startByte: shouldIncrement ? cached.fileSize : 0,
    initialLinesRead: shouldIncrement ? cached.linesRead : 0,
    initialDraws: shouldIncrement ? cached.draws : [],
    initialPendingDraw: shouldIncrement ? cached.pendingDraw : null,
    initialEncounters: shouldIncrement ? cached.encounters : [],
    initialEncounterState: shouldIncrement ? cached.encounterState : createEncounterDetectorState(),
    scanMode: shouldIncrement ? "incremental" : "full",
    onProgress: options.onProgress
  });

  if (cache) {
    await cache.write({
      filePath,
      fileSize: streamResult.fileSize,
      linesRead: streamResult.linesRead,
      scannedAt: streamResult.scannedAt,
      draws: streamResult.draws,
      pendingDraw: streamResult.pendingDraw,
      encounters: streamResult.encounters,
      encounterState: streamResult.encounterState
    });
  }

  return streamResult;
}

export async function loadCachedClientLog(filePath: string, cache: LogScanCachePort): Promise<ClientLogScan | null> {
  const cached = await cache.read(filePath);
  return cached ? createCachedScan(cached, "restored") : null;
}

async function canResumeFromCache(
  filePath: string,
  currentFileSize: number,
  cached: LogScanSnapshot,
  cache: LogScanCachePort
): Promise<boolean> {
  if (cached.fileSize > currentFileSize) {
    return false;
  }

  return cache.matchesAnchor(filePath, cached);
}

function createCachedScan(cached: LogScanSnapshot, scanMode: Extract<ScanMode, "cached" | "restored"> = "cached"): ClientLogScan {
  return {
    fileSize: cached.fileSize,
    linesRead: cached.linesRead,
    scannedAt: new Date().toISOString(),
    scanMode,
    bytesScanned: 0,
    cachedBytes: cached.fileSize,
    draws: cached.draws,
    pendingDraw: cached.pendingDraw,
    encounters: cached.encounters,
    activeEncounter: cached.encounterState.activeEncounter,
    encounterState: cached.encounterState
  };
}

async function scanClientLogStream(filePath: string, options: ScanStreamOptions): Promise<ClientLogScan> {
  const draws = [...options.initialDraws];
  const encounters = [...options.initialEncounters];
  const input = createReadStream(filePath, {
    highWaterMark: READ_STREAM_HIGH_WATER_MARK,
    start: options.startByte
  });

  let bytesReadFromStream = 0;
  let linesRead = options.initialLinesRead;
  let pendingDraw = options.initialPendingDraw;
  let encounterState = options.initialEncounterState;
  let pendingBuffer = Buffer.alloc(0);
  let lastProgressAt = 0;

  for await (const chunk of input) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytesReadFromStream += bufferChunk.length;

    const buffer = pendingBuffer.length > 0 ? Buffer.concat([pendingBuffer, bufferChunk]) : bufferChunk;
    let lineStart = 0;
    let newlineIndex = buffer.indexOf(10, lineStart);

    while (newlineIndex !== -1) {
      const lineBuffer = stripCarriageReturn(buffer.subarray(lineStart, newlineIndex));
      const nextState = parseLogLine(lineBuffer.toString("utf8"), linesRead + 1, pendingDraw, draws, encounterState, encounters);
      linesRead = nextState.linesRead;
      pendingDraw = nextState.pendingDraw;
      encounterState = nextState.encounterState;
      lineStart = newlineIndex + 1;
      newlineIndex = buffer.indexOf(10, lineStart);
    }

    pendingBuffer = buffer.subarray(lineStart);

    const now = Date.now();
    if (options.onProgress && now - lastProgressAt > PROGRESS_INTERVAL_MS) {
      lastProgressAt = now;
      options.onProgress({
        bytesRead: Math.min(options.fileSize, options.startByte + bytesReadFromStream),
        totalBytes: options.fileSize,
        linesRead,
        drawsFound: draws.length,
        cachedBytes: options.startByte,
        scanMode: options.scanMode
      });
    }
  }

  if (pendingBuffer.length > 0) {
    const lineBuffer = stripCarriageReturn(pendingBuffer);
    const nextState = parseLogLine(lineBuffer.toString("utf8"), linesRead + 1, pendingDraw, draws, encounterState, encounters);
    linesRead = nextState.linesRead;
    pendingDraw = nextState.pendingDraw;
    encounterState = nextState.encounterState;
  }

  options.onProgress?.({
    bytesRead: options.fileSize,
    totalBytes: options.fileSize,
    linesRead,
    drawsFound: draws.length,
    cachedBytes: options.startByte,
    scanMode: options.scanMode
  });

  return {
    fileSize: options.fileSize,
    linesRead,
    scannedAt: new Date().toISOString(),
    scanMode: options.scanMode,
    bytesScanned: options.fileSize - options.startByte,
    cachedBytes: options.startByte,
    draws,
    pendingDraw,
    encounters,
    activeEncounter: encounterState.activeEncounter,
    encounterState
  };
}

function parseLogLine(
  line: string,
  lineNumber: number,
  pendingDraw: CachedPendingDraw | null,
  draws: ClientLogDraw[],
  encounterState: EncounterDetectorState,
  encounters: ClientLogEncounter[]
): { linesRead: number; pendingDraw: CachedPendingDraw | null; encounterState: EncounterDetectorState } {
  const nextEncounterState = detectEncounterLogLine(line, lineNumber, encounterState, encounters);
  const timestamp = parseTimestampFromLogLine(line);
  const cardName = parseCardNameFromLine(line);
  const hasMarker = line.includes(CARD_DRAW_MARKER);

  if (hasMarker && timestamp && cardName) {
    draws.push(createDraw(lineNumber, timestamp, cardName));
    return { linesRead: lineNumber, pendingDraw: null, encounterState: nextEncounterState };
  }

  if (hasMarker && timestamp) {
    return { linesRead: lineNumber, pendingDraw: { timestamp, lineNumber }, encounterState: nextEncounterState };
  }

  if (pendingDraw && cardName) {
    draws.push(createDraw(pendingDraw.lineNumber, pendingDraw.timestamp, cardName));
    return { linesRead: lineNumber, pendingDraw: null, encounterState: nextEncounterState };
  }

  if (timestamp) {
    return { linesRead: lineNumber, pendingDraw: null, encounterState: nextEncounterState };
  }

  return { linesRead: lineNumber, pendingDraw, encounterState: nextEncounterState };
}

function stripCarriageReturn(buffer: Buffer): Buffer {
  return buffer.length > 0 && buffer[buffer.length - 1] === 13 ? buffer.subarray(0, -1) : buffer;
}

function createDraw(lineNumber: number, timestamp: string, cardName: string): ClientLogDraw {
  return {
    id: `${lineNumber}-${timestamp}-${cardName}`,
    lineNumber,
    timestamp,
    cardName
  };
}
