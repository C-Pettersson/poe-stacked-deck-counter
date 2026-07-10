import {
  ClipboardCopy,
  FileDown,
  FilePlus2,
  Play,
  RefreshCw,
  Save,
  Search,
  Square,
  Trash2,
  Coins,
  ExternalLink,
  Minus,
  Plus
} from "lucide-react";
import { useMemo, useState, type ReactElement } from "react";
import type { RunItemRole } from "../../domain/collection.js";
import type { useResearchRuns } from "../app/useResearchRuns.js";
import { EmptyState } from "../components/EmptyState.js";

type ResearchRuns = ReturnType<typeof useResearchRuns>;

export function CollectTab({ research }: { research: ResearchRuns }): ReactElement {
  const [templateQuery, setTemplateQuery] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const templates = useMemo(() => {
    const query = templateQuery.trim().toLowerCase();
    return (research.catalog?.templates ?? []).filter(
      (template) =>
        !query ||
        template.title.toLowerCase().includes(query) ||
        template.name.toLowerCase().includes(query) ||
        template.categoryName?.toLowerCase().includes(query)
    );
  }, [research.catalog?.templates, templateQuery]);

  if (research.activeRun) {
    return <ActiveRunWorkspace research={research} itemQuery={itemQuery} setItemQuery={setItemQuery} />;
  }

  return (
    <section className="research-layout">
      <div className="panel research-hero">
        <div>
          <span className="eyebrow">Wraeclast Field Notes</span>
          <h2>Choose what you are researching</h2>
          <p>Start from a poe.how strategy template or create unlinked notes. Everything stays local until you export.</p>
        </div>
        <div className="research-actions">
          <button type="button" onClick={() => research.createRun(null)}>
            <FilePlus2 size={18} />
            Custom study
          </button>
          <button type="button" onClick={() => void research.refreshCatalog()}>
            <RefreshCw size={18} />
            Refresh guide
          </button>
        </div>
      </div>

      <div className="research-status" role="status">
        {research.catalogStatus}
      </div>

      <label className="template-search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          placeholder="Search strategies or categories"
          value={templateQuery}
          onChange={(event) => setTemplateQuery(event.target.value)}
        />
      </label>

      {templates.length > 0 ? (
        <div className="template-grid">
          {templates.map((template) => (
            <article className="template-card" key={template.name}>
              <div className="template-card-copy">
                <span>{template.categoryName ?? "Uncategorized"}</span>
                <h3>{template.title}</h3>
                <p>{template.description}</p>
              </div>
              <div className="template-card-meta">
                <span>{template.requirements.length} inputs</span>
                <span>{template.rewards.length} rewards</span>
              </div>
              <button className="primary-button" type="button" onClick={() => research.createRun(template)}>
                <FilePlus2 size={18} />
                Open field notes
              </button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={research.isLoading ? "Loading the field guide" : "No matching strategy templates"}
          body={research.isLoading ? "Reading public strategy metadata from poe.how." : "Try another search or start a custom study."}
        />
      )}
    </section>
  );
}

function ActiveRunWorkspace({
  research,
  itemQuery,
  setItemQuery
}: {
  research: ResearchRuns;
  itemQuery: string;
  setItemQuery: (value: string) => void;
}): ReactElement {
  const run = research.activeRun!;
  const isDetectedEncounter = run.origin === "detector" && run.template?.name.startsWith("client-log-");

  return (
    <section className="research-layout">
      <div className="panel active-study-header">
        <div>
          <span className="eyebrow">{isDetectedEncounter ? "Encounter detected from Client.txt" : (run.template?.categoryName ?? "Custom field study")}</span>
          <h2>{isDetectedEncounter ? `Log loot: ${run.title.replace(/ drops$/i, "")}` : run.title}</h2>
          <p>{run.template?.description ?? "Locally collected research notes ready for Codex handoff."}</p>
          {isDetectedEncounter ? (
            <div className="encounter-reference-actions">
              {run.template?.wikiUrl ? (
                <button type="button" onClick={() => research.openReference(run.template!.wikiUrl!)}>
                  <ExternalLink size={15} /> PoE Wiki
                </button>
              ) : null}
              {run.template?.poedbUrl ? (
                <button type="button" onClick={() => research.openReference(run.template!.poedbUrl!)}>
                  <ExternalLink size={15} /> PoEDB
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <span className={`run-state ${run.lifecycle}`}>{run.lifecycle}</span>
      </div>

      {research.notice ? <div className="research-status">{research.notice}</div> : null}

      <div className="panel study-form-grid">
        <label className="field-shell span-two">
          <span>Study title</span>
          <input value={run.title} onChange={(event) => research.editRun({ title: event.target.value })} />
        </label>
        <label className="field-shell">
          <span>Runs</span>
          <input
            type="number"
            min={1}
            value={run.runCount}
            onChange={(event) => research.editRun({ runCount: Number(event.target.value) })}
          />
        </label>
        <label className="field-shell">
          <span>Duration (minutes)</span>
          <input
            type="number"
            min={0}
            value={run.durationSeconds === undefined ? "" : Math.round(run.durationSeconds / 60)}
            onChange={(event) =>
              research.editRun({ durationSeconds: event.target.value ? Number(event.target.value) * 60 : undefined })
            }
          />
        </label>
        <label className="field-shell">
          <span>League</span>
          <select value={run.leagueId} onChange={(event) => research.editRun({ leagueId: event.target.value })}>
            <option value="">Select league</option>
            {research.catalog?.leagues.map((league) => (
              <option value={league.id} key={league.id}>{league.displayName}</option>
            ))}
          </select>
        </label>
        <label className="field-shell">
          <span>Game version</span>
          <select value={run.gameVersion} onChange={(event) => research.editRun({ gameVersion: event.target.value })}>
            <option value="">Select version</option>
            {research.catalog?.releaseVersions.filter((version) => version.active).map((version) => (
              <option value={version.version} key={version.id}>{version.name} ({version.version})</option>
            ))}
          </select>
        </label>
        <label className="field-shell span-two">
          <span>Research notes</span>
          <textarea value={run.notes} rows={3} onChange={(event) => research.editRun({ notes: event.target.value })} />
        </label>
      </div>

      {isDetectedEncounter ? (
        <EncounterDropPicker research={research} />
      ) : (
        <div className="run-items-grid">
          <RunItemGroup
            title="Investment and requirements"
            role="requirement"
            research={research}
          />
          <RunItemGroup title="Rewards and outcomes" role="reward" research={research} />
        </div>
      )}

      <RunValuation research={research} />

      <div className="panel item-search-panel">
        <div>
          <h3>Add another item</h3>
          <p>Item metadata comes from poe.how; valuation still comes directly from poe.ninja or poe.watch.</p>
        </div>
        <form
          className="item-search-form"
          onSubmit={(event) => {
            event.preventDefault();
            void research.searchItems(itemQuery);
          }}
        >
          <input
            type="search"
            value={itemQuery}
            placeholder="Search by item name"
            onChange={(event) => setItemQuery(event.target.value)}
          />
          <button type="submit" disabled={research.isSearchingItems || itemQuery.trim().length < 2}>
            <Search size={18} />
            Search
          </button>
        </form>
        {research.itemSearchResults.length > 0 ? (
          <div className="item-search-results">
            {research.itemSearchResults.map((item) => (
              <div className="item-search-result" key={item.detailsId}>
                <ItemArtwork name={item.name} icon={item.icon} />
                <span>{item.name}</span>
                <div>
                  <button type="button" onClick={() => research.addItem("requirement", item)}>+ Input</button>
                  <button type="button" onClick={() => research.addItem("reward", item)}>+ Reward</button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="sticky-run-actions">
        <button type="button" onClick={() => research.setActiveRun(null)}>Close</button>
        <button type="button" onClick={() => void research.saveActiveRun()}>
          <Save size={18} /> Save locally
        </button>
        {run.lifecycle === "active" ? (
          <button type="button" onClick={research.finishActiveRun}><Square size={18} /> Complete</button>
        ) : (
          <button type="button" onClick={research.beginActiveRun}><Play size={18} /> Start timer</button>
        )}
        <button type="button" onClick={() => void research.saveDraft()}>
          <FileDown size={18} /> Save draft
        </button>
        <button className="primary-button" type="button" onClick={() => void research.copyDraft()}>
          <ClipboardCopy size={18} /> Copy Codex draft
        </button>
      </div>
    </section>
  );
}

function EncounterDropPicker({ research }: { research: ResearchRuns }): ReactElement {
  const rewards = research.activeRun?.items.filter((item) => item.role === "reward") ?? [];
  return (
    <section className="panel encounter-drop-panel">
      <div className="encounter-drop-heading">
        <div>
          <span className="eyebrow">Quick drop entry</span>
          <h3>What dropped?</h3>
          <p>Tap an item once per copy. Use minus to correct a count.</p>
        </div>
        <strong>{rewards.reduce((sum, item) => sum + item.amount, 0)} items recorded</strong>
      </div>
      {rewards.length > 0 ? (
        <div className="encounter-drop-grid">
          {rewards.map((item) => (
            <article className={`encounter-drop-card ${item.amount > 0 ? "selected" : ""}`} key={item.id}>
              <button
                className="encounter-drop-add"
                type="button"
                aria-label={`Add ${item.name}`}
                onClick={() => research.changeItemAmount(item.id, item.amount + 1)}
              >
                <ItemArtwork name={item.name} icon={item.icon} large />
                <strong>{item.name}</strong>
                <span className="drop-count">{item.amount}</span>
              </button>
              <button
                className="encounter-drop-minus"
                type="button"
                aria-label={`Remove one ${item.name}`}
                disabled={item.amount <= 0}
                onClick={() => research.changeItemAmount(item.id, Math.max(0, item.amount - 1))}
              >
                <Minus size={16} />
              </button>
              <Plus className="encounter-drop-plus" size={18} aria-hidden="true" />
            </article>
          ))}
        </div>
      ) : (
        <p className="encounter-no-drops">No curated drop list is available for this encounter yet. Search below to add what dropped.</p>
      )}
    </section>
  );
}

function ItemArtwork({ name, icon, large = false }: { name: string; icon?: string; large?: boolean }): ReactElement {
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
  return (
    <span className={`item-artwork ${large ? "large" : ""}`} aria-hidden="true">
      <span>{initials}</span>
      {icon ? <img src={icon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
    </span>
  );
}

function RunItemGroup({ title, role, research }: { title: string; role: RunItemRole; research: ResearchRuns }): ReactElement {
  const items = research.activeRun?.items.filter((item) => item.role === role) ?? [];
  return (
    <section className="panel run-item-group">
      <h3>{title}</h3>
      {items.length === 0 ? <p className="muted-copy">No items recorded.</p> : null}
      {items.map((item) => (
        <div className="run-item-row" key={item.id}>
          <div>
            <strong>{item.name}</strong>
            <span>
              {item.provenance} · {formatItemValue(item.amount, item.priceOverrideChaos, research.marketQuotes[item.detailsId])}
            </span>
          </div>
          <input
            aria-label={`${item.name} amount`}
            type="number"
            min={0}
            step="any"
            value={item.amount}
            onChange={(event) => research.changeItemAmount(item.id, Number(event.target.value))}
          />
          <button aria-label={`Remove ${item.name}`} type="button" onClick={() => research.deleteItem(item.id)}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </section>
  );
}

function RunValuation({ research }: { research: ResearchRuns }): ReactElement {
  const run = research.activeRun!;
  const totals = run.items.reduce(
    (result, item) => {
      const unitPrice = item.priceOverrideChaos ?? research.marketQuotes[item.detailsId]?.chaosValue;
      if (unitPrice === undefined) return result;
      result[item.role] += unitPrice * item.amount;
      return result;
    },
    { requirement: 0, reward: 0 }
  );
  return (
    <section className="panel run-valuation">
      <div>
        <span>Inputs</span>
        <strong>{totals.requirement.toFixed(1)} chaos</strong>
      </div>
      <div>
        <span>Rewards</span>
        <strong>{totals.reward.toFixed(1)} chaos</strong>
      </div>
      <div>
        <span>Net observation</span>
        <strong>{(totals.reward - totals.requirement).toFixed(1)} chaos</strong>
      </div>
      <button type="button" disabled={research.isPricing} onClick={() => void research.refreshMarketQuotes(true)}>
        <Coins size={18} /> {research.isPricing ? "Refreshing..." : "Refresh market values"}
      </button>
      <p>Local estimate only. Prices are never included in a Codex draft.</p>
    </section>
  );
}

function formatItemValue(
  amount: number,
  override: number | undefined,
  quote: ResearchRuns["marketQuotes"][string] | undefined
): string {
  const unitPrice = override ?? quote?.chaosValue;
  if (unitPrice === undefined) return "unpriced";
  const source = override !== undefined ? "override" : quote?.source === "poe-watch" ? "poe.watch" : "poe.ninja";
  return `${(unitPrice * amount).toFixed(1)} chaos (${source})`;
}
