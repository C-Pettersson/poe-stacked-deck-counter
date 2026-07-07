import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
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
