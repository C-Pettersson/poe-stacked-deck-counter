import { Archive, BookOpen, ClipboardCopy, FileDown, Pencil } from "lucide-react";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import type { CollectionRun, RunLifecycle, RunItem } from "../../domain/collection.js";
import type { useResearchRuns } from "../app/useResearchRuns.js";
import type { useStackedDeckFeature } from "../app/useStackedDeckFeature.js";
import { EmptyState } from "../components/EmptyState.js";
import { StatusStrip } from "../components/StatusStrip.js";
import {
  buildRunShelves,
  getStackedDeckSessionId,
  getStudyType,
  STUDY_TYPES,
  type StudyTypeFilter
} from "../studyTypes.js";
import { StackedDeckRunDetail } from "./SessionsTab.js";

type ResearchRuns = ReturnType<typeof useResearchRuns>;
type StackedDeckFeature = ReturnType<typeof useStackedDeckFeature>;

export function RunsTab({
  deck,
  research,
  onEdit
}: {
  deck: StackedDeckFeature;
  research: ResearchRuns;
  onEdit: () => void;
}): ReactElement {
  const [query, setQuery] = useState("");
  const [studyType, setStudyType] = useState<StudyTypeFilter>("all");
  const [lifecycle, setLifecycle] = useState<"all" | RunLifecycle>("all");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const shelves = useMemo(
    () => buildRunShelves(research.runs, { query, studyType, lifecycle }),
    [lifecycle, query, research.runs, studyType]
  );
  const visibleRuns = useMemo(() => shelves.flatMap((shelf) => shelf.runs), [shelves]);
  const selectedRun = visibleRuns.find((run) => run.id === selectedRunId) ?? visibleRuns[0] ?? null;

  useEffect(() => {
    if (selectedRun?.id !== selectedRunId) setSelectedRunId(selectedRun?.id ?? null);
  }, [selectedRun?.id, selectedRunId]);

  if (research.runs.length === 0) {
    return (
      <EmptyState
        title="No saved field studies"
        body="Choose a strategy under Collect, record the run, and save it locally. Each saved run becomes a book here."
      />
    );
  }

  return (
    <section className="research-layout run-library">
      {research.notice ? <div className="research-status">{research.notice}</div> : null}

      <div className="panel run-library-heading">
        <div>
          <span className="eyebrow">Local research archive</span>
          <h2>Run library</h2>
          <p>Every book is one saved run. Choose a volume to read its complete field notes.</p>
        </div>
        <BookOpen size={30} aria-hidden="true" />
      </div>

      <div className="panel run-history-filters">
        <label className="field-shell run-search-field">
          <span>Search run books</span>
          <input
            aria-label="Search run books"
            placeholder="Title, notes, or study"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="field-shell">
          <span>Study type</span>
          <select value={studyType} onChange={(event) => setStudyType(event.target.value as StudyTypeFilter)}>
            <option value="all">All shelves</option>
            {STUDY_TYPES.map((type) => <option value={type.id} key={type.id}>{type.label}</option>)}
          </select>
        </label>
        <label className="field-shell">
          <span>Lifecycle</span>
          <select value={lifecycle} onChange={(event) => setLifecycle(event.target.value as "all" | RunLifecycle)}>
            <option value="all">All field notes</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>

      {shelves.length > 0 ? (
        <div className="run-shelves" aria-label="Run books grouped by study type">
          {shelves.map((shelf) => (
            <section className="run-shelf" key={shelf.studyType.id} aria-labelledby={`shelf-${shelf.studyType.id}`}>
              <div className="run-shelf-heading">
                <div>
                  <span className="run-shelf-symbol" aria-hidden="true">{shelf.studyType.symbol}</span>
                  <div>
                    <h3 id={`shelf-${shelf.studyType.id}`}>{shelf.studyType.label}</h3>
                    <p>{shelf.studyType.description}</p>
                  </div>
                </div>
                <span>{shelf.runs.length} {shelf.runs.length === 1 ? "volume" : "volumes"}</span>
              </div>
              <div className="run-shelf-books">
                {shelf.runs.map((run) => (
                  <RunBook
                    key={run.id}
                    run={run}
                    selected={run.id === selectedRun?.id}
                    onSelect={() => setSelectedRunId(run.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title="No matching run books" body="Try a different search, study type, or lifecycle filter." />
      )}

      {selectedRun ? (
        <RunReadingDesk deck={deck} research={research} run={selectedRun} onEdit={onEdit} />
      ) : null}
    </section>
  );
}

function RunBook({
  run,
  selected,
  onSelect
}: {
  run: CollectionRun;
  selected: boolean;
  onSelect: () => void;
}): ReactElement {
  const studyType = getStudyType(run);
  const date = formatRunDate(run);

  return (
    <button
      aria-label={`${run.title}, ${date}, ${run.lifecycle}`}
      aria-pressed={selected}
      className={`run-book ${studyType.bookClassName} ${run.lifecycle}${selected ? " selected" : ""}`}
      data-run-id={run.id}
      type="button"
      onClick={onSelect}
    >
      <span className="run-book-binding" aria-hidden="true" />
      <span className="run-book-mark" aria-hidden="true">{studyType.symbol}</span>
      <strong title={run.title}>{run.title}</strong>
      <small>{date}</small>
      <span className={`run-state ${run.lifecycle}`}>{run.lifecycle}</span>
    </button>
  );
}

function RunReadingDesk({
  deck,
  research,
  run,
  onEdit
}: {
  deck: StackedDeckFeature;
  research: ResearchRuns;
  run: CollectionRun;
  onEdit: () => void;
}): ReactElement {
  const sessionId = getStackedDeckSessionId(run);
  const session = sessionId ? deck.sessions.find((candidate) => candidate.id === sessionId) : undefined;

  if (session && deck.settings) {
    return (
      <section className="run-reading-desk" aria-label={`Reading ${run.title}`}>
        <div className="run-reading-heading">
          <span className="eyebrow">Selected stacked-deck volume</span>
          <h2>{run.title}</h2>
        </div>
        <StatusStrip
          currencyMode={deck.settings.currencyMode}
          notice={deck.notice}
          priceSnapshot={deck.selectedPriceSnapshot}
          priceStatus={deck.priceStatus}
          summary={deck.summary}
        />
        <StackedDeckRunDetail
          currencyMode={deck.settings.currencyMode}
          fallbackCurrencySnapshot={deck.selectedPriceSnapshot}
          priceSnapshots={deck.priceSnapshots}
          session={session}
          sessionDeckPriceOverrides={deck.settings.sessionDeckPriceOverrides}
          onLeagueChange={deck.changeSessionLeague}
          onSessionDeckPriceChange={(targetSessionId, deckPriceChaos) =>
            void deck.changeSessionDeckPrice(targetSessionId, deckPriceChaos)
          }
          onDiscord={(targetSession) => void deck.copyDiscord(targetSession)}
          onReddit={(targetSession) => void deck.copyReddit(targetSession)}
          onCopyPoeHow={(targetSession) => void deck.copyPoeHow(targetSession)}
          onSavePoeHow={(targetSession) => void deck.savePoeHow(targetSession)}
          onSaveCsv={(targetSession) => void deck.saveCsv(targetSession)}
          onOpenCardWiki={deck.openCardWiki}
          onToggleCardValue={(cardName) => void deck.toggleIgnoredCardValue(cardName)}
        />
      </section>
    );
  }

  return <GenericRunDetail research={research} run={run} onEdit={onEdit} />;
}

function GenericRunDetail({
  research,
  run,
  onEdit
}: {
  research: ResearchRuns;
  run: CollectionRun;
  onEdit: () => void;
}): ReactElement {
  const requirements = run.items.filter((item) => item.role === "requirement" && item.amount > 0);
  const rewards = run.items.filter((item) => item.role === "reward" && item.amount > 0);
  const studyType = getStudyType(run);

  return (
    <article className="panel run-reading-desk generic-run-detail" aria-label={`Reading ${run.title}`}>
      <div className="run-reading-heading">
        <div>
          <span className="eyebrow">Selected {studyType.label.toLocaleLowerCase()} volume</span>
          <h2>{run.title}</h2>
          <p>{run.template?.description ?? "Locally collected research notes."}</p>
        </div>
        <span className={`run-state ${run.lifecycle}`}>{run.lifecycle}</span>
      </div>

      <dl className="run-reading-metrics">
        <div><dt>Runs</dt><dd>{run.runCount.toLocaleString()}</dd></div>
        <div><dt>Inputs</dt><dd>{requirements.length.toLocaleString()}</dd></div>
        <div><dt>Rewards</dt><dd>{rewards.length.toLocaleString()}</dd></div>
        <div><dt>Updated</dt><dd>{new Date(run.updatedAt).toLocaleDateString()}</dd></div>
      </dl>

      <div className="run-reading-items">
        <RunItemLedger title="Investment and requirements" items={requirements} />
        <RunItemLedger title="Rewards and outcomes" items={rewards} />
      </div>

      {run.notes.trim() ? (
        <section className="run-reading-notes">
          <h3>Research notes</h3>
          <p>{run.notes}</p>
        </section>
      ) : null}

      <div className="run-history-actions">
        <button type="button" onClick={() => { research.openRun(run); onEdit(); }}>
          <Pencil size={16} /> {run.lifecycle === "archived" ? "Restore and edit" : "Edit"}
        </button>
        <button type="button" onClick={() => void research.copyDraft(run)}>
          <ClipboardCopy size={16} /> Copy draft
        </button>
        <button type="button" onClick={() => void research.saveDraft(run)}>
          <FileDown size={16} /> Save draft
        </button>
        {run.lifecycle !== "archived" ? (
          <button type="button" onClick={() => void research.archiveSavedRun(run)}>
            <Archive size={16} /> Archive
          </button>
        ) : null}
      </div>
    </article>
  );
}

function RunItemLedger({ title, items }: { title: string; items: RunItem[] }): ReactElement {
  return (
    <section>
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => <li key={item.id}><span>{item.name}</span><strong>{item.amount.toLocaleString()}</strong></li>)}
        </ul>
      ) : (
        <p>No entries recorded.</p>
      )}
    </section>
  );
}

function formatRunDate(run: CollectionRun): string {
  return new Date(run.startedAt ?? run.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
