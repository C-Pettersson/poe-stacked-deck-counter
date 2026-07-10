import { FileSearch } from "lucide-react";
import type { ReactElement } from "react";

export function EmptyState({ title = "No sessions loaded", body }: { title?: string; body?: string }): ReactElement {
  return (
    <div className="empty-state">
      <FileSearch size={34} />
      <strong>{title}</strong>
      {body ? <span>{body}</span> : null}
    </div>
  );
}
