import { FileSearch } from "lucide-react";
import type { ReactElement } from "react";

export function EmptyState(): ReactElement {
  return (
    <div className="empty-state">
      <FileSearch size={34} />
      <span>No sessions loaded</span>
    </div>
  );
}
