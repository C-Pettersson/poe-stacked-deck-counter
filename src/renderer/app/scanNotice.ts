import type { ScanResult } from "../../shared/types.js";

export function createScanNotice(result: ScanResult, prefix: string): string {
  const modeLabel = getScanModeLabel(result);
  return `${prefix} ${result.draws.length} card draws in ${result.sessions.length} sessions${modeLabel ? ` (${modeLabel})` : ""}.`;
}

function getScanModeLabel(result: ScanResult): string | null {
  switch (result.scanMode) {
    case "cached":
      return "cache reused";
    case "restored":
      return "from saved cache";
    case "incremental":
      return `${(result.bytesScanned ?? 0).toLocaleString()} new bytes`;
    case "full":
      return "full scan";
    default:
      return null;
  }
}
