import { Archive, ClipboardCopy, FileDown, Pencil } from "lucide-react";
import { useMemo, useState, type ReactElement } from "react";
import type { RunLifecycle } from "../../domain/collection.js";
import type { useResearchRuns } from "../app/useResearchRuns.js";
import { EmptyState } from "../components/EmptyState.js";

type ResearchRuns = ReturnType<typeof useResearchRuns>;

export function RunsTab({ research, onEdit }: { research: ResearchRuns; onEdit: () => void }): ReactElement {
  const [query, setQuery] = useState("");
  const [lifecycle, setLifecycle] = useState<"all" | RunLifecycle>("all");
  const visibleRuns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return research.runs.filter(
      (run) =>
        (lifecycle === "all" || run.lifecycle === lifecycle) &&
        (!normalizedQuery ||
          run.title.toLowerCase().includes(normalizedQuery) ||
          run.template?.name.toLowerCase().includes(normalizedQuery) ||
          run.notes.toLowerCase().includes(normalizedQuery))
    );
  }, [lifecycle, query, research.runs]);

  if (research.runs.length === 0) {
    return (
      <EmptyState
        title="No saved field studies"
        body="Choose a strategy under Collect, record the run, and save it locally."
      />
    );
  }

  return (
    <section className="research-layout">
      {research.notice ? <div className="research-status">{research.notice}</div> : null}
      <div className="panel run-history-filters">
        <label className="field-shell">
          <span>Search field studies</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label className="field-shell">
          <span>Lifecycle</span>
          <select value={lifecycle} onChange={(event) => setLifecycle(event.target.value as "all" | RunLifecycle)}>
            <option value="all">All current studies</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </label>
      </div>
      {visibleRuns.length === 0 ? (
        <EmptyState title="No matching field studies" body="Try a different search or lifecycle filter." />
      ) : null}
      <div className="run-history-grid">
        {visibleRuns.map((run) => {
          const rewards = run.items.filter((item) => item.role === "reward" && item.amount > 0);
          const requirements = run.items.filter((item) => item.role === "requirement" && item.amount > 0);
          return (
            <article className="panel run-history-card" key={run.id}>
              <div className="run-history-heading">
                <div>
                  <span className="eyebrow">{run.template?.categoryName ?? "Custom field study"}</span>
                  <h3>{run.title}</h3>
                </div>
                <span className={`run-state ${run.lifecycle}`}>{run.lifecycle}</span>
              </div>
              <dl>
                <div><dt>Runs</dt><dd>{run.runCount.toLocaleString()}</dd></div>
                <div><dt>Inputs</dt><dd>{requirements.length}</dd></div>
                <div><dt>Rewards</dt><dd>{rewards.length}</dd></div>
                <div><dt>Updated</dt><dd>{new Date(run.updatedAt).toLocaleDateString()}</dd></div>
              </dl>
              <div className="run-history-actions">
                <button type="button" onClick={() => { research.openRun(run); onEdit(); }}>
                  <Pencil size={16} /> Edit
                </button>
                <button type="button" onClick={() => void research.copyDraft(run)}>
                  <ClipboardCopy size={16} /> Copy draft
                </button>
                <button type="button" onClick={() => void research.saveDraft(run)}>
                  <FileDown size={16} /> Save draft
                </button>
                <button type="button" onClick={() => void research.archiveSavedRun(run)}>
                  <Archive size={16} /> Archive
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
