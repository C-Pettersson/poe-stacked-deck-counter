import type { ClientLogDraw } from "./types.js";

export const CARD_DRAW_MARKER = "Card drawn from the deck:";

const timestampPattern =
  /^(?<year>\d{4})\/(?<month>\d{2})\/(?<day>\d{2}) (?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})/;
const divinationPattern = /<divination>\{(?<card>[^}]+)\}/;

interface PendingDraw {
  timestamp: string;
  lineNumber: number;
}

export function parseTimestampFromLogLine(line: string): string | null {
  const match = timestampPattern.exec(line);
  if (!match?.groups) {
    return null;
  }

  const { year, month, day, hour, minute, second } = match.groups;
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();
}

export function parseCardNameFromLine(line: string): string | null {
  const match = divinationPattern.exec(line);
  return match?.groups?.card?.trim() || null;
}

export function parseClientLogLines(lines: Iterable<string>): ClientLogDraw[] {
  const draws: ClientLogDraw[] = [];
  let pending: PendingDraw | null = null;
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber += 1;
    const timestamp = parseTimestampFromLogLine(line);
    const cardName = parseCardNameFromLine(line);
    const hasMarker = line.includes(CARD_DRAW_MARKER);

    if (hasMarker && timestamp && cardName) {
      draws.push(createDraw(lineNumber, timestamp, cardName));
      pending = null;
      continue;
    }

    if (hasMarker && timestamp) {
      pending = { timestamp, lineNumber };
      continue;
    }

    if (pending && cardName) {
      draws.push(createDraw(pending.lineNumber, pending.timestamp, cardName));
      pending = null;
      continue;
    }

    if (timestamp) {
      pending = null;
    }
  }

  return draws;
}

function createDraw(lineNumber: number, timestamp: string, cardName: string): ClientLogDraw {
  return {
    id: `${lineNumber}-${timestamp}-${cardName}`,
    lineNumber,
    timestamp,
    cardName
  };
}
