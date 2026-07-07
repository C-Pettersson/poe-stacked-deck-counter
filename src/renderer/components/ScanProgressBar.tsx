import type { ReactElement } from "react";
import type { ScanProgress } from "../../shared/types.js";

export function ScanProgressBar({ progress }: { progress: ScanProgress }): ReactElement {
  const percent = progress.totalBytes > 0 ? Math.min(100, (progress.bytesRead / progress.totalBytes) * 100) : 0;
  const hasMeasuredProgress = progress.totalBytes > 0 && percent > 0;
  const progressLabel = hasMeasuredProgress
    ? `${percent.toFixed(1)}% - ${progress.linesRead.toLocaleString()} lines - ${progress.drawsFound.toLocaleString()} draws`
    : "Scanning log...";

  return (
    <div
      aria-live="polite"
      className={hasMeasuredProgress ? "scan-progress" : "scan-progress is-indeterminate"}
      role="status"
    >
      <div
        aria-hidden="true"
        className="scan-progress-fill"
        style={{ width: hasMeasuredProgress ? `${percent}%` : undefined }}
      />
      <span className="scan-progress-label">{progressLabel}</span>
    </div>
  );
}
