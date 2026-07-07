import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import readline from "node:readline";
import { parseCardNameFromLine, parseTimestampFromLogLine, CARD_DRAW_MARKER } from "../../shared/clientLog.js";
import type { ClientLogDraw, ScanProgress } from "../../shared/types.js";

interface PendingDraw {
  timestamp: string;
  lineNumber: number;
}

export async function scanClientLog(
  filePath: string,
  onProgress?: (progress: ScanProgress) => void
): Promise<{ fileSize: number; draws: ClientLogDraw[] }> {
  try {
    return await scanClientLogWithRipgrep(filePath, onProgress);
  } catch {
    return scanClientLogStream(filePath, onProgress);
  }
}

async function scanClientLogWithRipgrep(
  filePath: string,
  onProgress?: (progress: ScanProgress) => void
): Promise<{ fileSize: number; draws: ClientLogDraw[] }> {
  const fileStats = await stat(filePath);
  const output = await runRipgrep([
    "--line-number",
    "--no-heading",
    "--after-context",
    "1",
    "--fixed-strings",
    CARD_DRAW_MARKER,
    filePath
  ]);
  const draws = parseRipgrepOutput(output);

  onProgress?.({
    bytesRead: fileStats.size,
    totalBytes: fileStats.size,
    linesRead: draws.at(-1)?.lineNumber ?? 0,
    drawsFound: draws.length
  });

  return { fileSize: fileStats.size, draws };
}

function runRipgrep(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("rg", args, { windowsHide: true });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 || code === 1) {
        resolve(Buffer.concat(stdout).toString("utf8"));
        return;
      }

      reject(new Error(Buffer.concat(stderr).toString("utf8") || `rg exited with code ${code}`));
    });
  });
}

function parseRipgrepOutput(output: string): ClientLogDraw[] {
  const draws: ClientLogDraw[] = [];
  let pending: PendingDraw | null = null;

  for (const rawLine of output.split(/\r?\n/)) {
    if (!rawLine) {
      continue;
    }

    const match = rawLine.match(/^(\d+)([:-])(.*)$/);
    if (!match) {
      continue;
    }

    const lineNumber = Number(match[1]);
    const separator = match[2];
    const line = match[3];
    const timestamp = parseTimestampFromLogLine(line);
    const cardName = parseCardNameFromLine(line);
    const hasMarker = line.includes(CARD_DRAW_MARKER);

    if (separator === ":" && hasMarker && timestamp && cardName) {
      draws.push(createDraw(lineNumber, timestamp, cardName));
      pending = null;
    } else if (separator === ":" && hasMarker && timestamp) {
      pending = { timestamp, lineNumber };
    } else if (separator === "-" && pending && cardName) {
      draws.push(createDraw(pending.lineNumber, pending.timestamp, cardName));
      pending = null;
    } else if (separator === ":" && timestamp) {
      pending = null;
    }
  }

  return draws;
}

async function scanClientLogStream(
  filePath: string,
  onProgress?: (progress: ScanProgress) => void
): Promise<{ fileSize: number; draws: ClientLogDraw[] }> {
  const fileStats = await stat(filePath);
  const draws: ClientLogDraw[] = [];
  const input = createReadStream(filePath, { encoding: "utf8", highWaterMark: 1024 * 1024 });
  const reader = readline.createInterface({ input, crlfDelay: Infinity });

  let bytesRead = 0;
  let linesRead = 0;
  let pending: PendingDraw | null = null;
  let lastProgressAt = 0;

  input.on("data", (chunk) => {
    bytesRead += Buffer.byteLength(chunk, "utf8");
  });

  for await (const line of reader) {
    linesRead += 1;

    const timestamp = parseTimestampFromLogLine(line);
    const cardName = parseCardNameFromLine(line);
    const hasMarker = line.includes(CARD_DRAW_MARKER);

    if (hasMarker && timestamp && cardName) {
      draws.push(createDraw(linesRead, timestamp, cardName));
      pending = null;
    } else if (hasMarker && timestamp) {
      pending = { timestamp, lineNumber: linesRead };
    } else if (pending && cardName) {
      draws.push(createDraw(pending.lineNumber, pending.timestamp, cardName));
      pending = null;
    } else if (timestamp) {
      pending = null;
    }

    const now = Date.now();
    if (onProgress && now - lastProgressAt > 250) {
      lastProgressAt = now;
      onProgress({ bytesRead, totalBytes: fileStats.size, linesRead, drawsFound: draws.length });
    }
  }

  onProgress?.({ bytesRead: fileStats.size, totalBytes: fileStats.size, linesRead, drawsFound: draws.length });

  return { fileSize: fileStats.size, draws };
}

function createDraw(lineNumber: number, timestamp: string, cardName: string): ClientLogDraw {
  return {
    id: `${lineNumber}-${timestamp}-${cardName}`,
    lineNumber,
    timestamp,
    cardName
  };
}
