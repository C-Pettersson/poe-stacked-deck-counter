import {
  ArrowLeft,
  BookOpen,
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
import { canReportRun } from "../../application/codexDraft.js";
import type { ItemGameData, RunItemRole } from "../../domain/collection.js";
import type { useResearchRuns } from "../app/useResearchRuns.js";
import { describeCatalogItemSearchResults } from "../catalogItemMetadata.js";
import { resolveItemTooltipData } from "../itemTooltipData.js";
import {
  buildResearchCategoryBooks,
  filterTemplatesByResearchCategory,
  type ResearchCategoryId
} from "../researchCategoryBooks.js";
import { EmptyState } from "../components/EmptyState.js";
import { GameItemDetails } from "../components/GameItemDetails.js";
import { ItemHover, type ItemHoverData, type ItemHoverRarity } from "../components/ItemHover.js";

type ResearchRuns = ReturnType<typeof useResearchRuns>;

export function CollectTab({ research }: { research: ResearchRuns }): ReactElement {
  const [selectedCategoryId, setSelectedCategoryId] = useState<ResearchCategoryId | null>(null);
  const [templateQuery, setTemplateQuery] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const categoryBooks = useMemo(
    () => buildResearchCategoryBooks(research.catalog?.categories ?? [], research.catalog?.templates ?? []),
    [research.catalog?.categories, research.catalog?.templates]
  );
  const selectedCategory = categoryBooks.find((category) => category.id === selectedCategoryId);
  const templates = useMemo(() => {
    const query = templateQuery.trim().toLowerCase();
    return filterTemplatesByResearchCategory(research.catalog?.templates ?? [], selectedCategoryId, query);
  }, [research.catalog?.templates, selectedCategoryId, templateQuery]);

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

      {selectedCategory ? (
        <>
          <div className="category-book-heading">
            <button
              className="category-back-button"
              type="button"
              onClick={() => {
                setSelectedCategoryId(null);
                setTemplateQuery("");
              }}
            >
              <ArrowLeft size={16} /> All research books
            </button>
            <div>
              <span className="eyebrow">Selected research book</span>
              <h3>{selectedCategory.label}</h3>
              <p>{selectedCategory.description}</p>
            </div>
          </div>

          <label className="template-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              placeholder={`Search ${selectedCategory.label} strategies`}
              value={templateQuery}
              onChange={(event) => setTemplateQuery(event.target.value)}
            />
          </label>

          {templates.length > 0 ? (
            <div className="template-grid">
              {templates.map((template) => (
                <article className="template-card" key={template.name}>
                  <div className="template-card-copy">
                    <span>{selectedCategory.label}</span>
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
              title="No matching strategy templates"
              body={`Try another search in the ${selectedCategory.label} research book.`}
            />
          )}
        </>
      ) : categoryBooks.length > 0 ? (
        <div className="category-book-grid" aria-label="Research categories">
          {categoryBooks.map((category) => (
            <button
              className="category-book"
              type="button"
              key={category.id}
              onClick={() => setSelectedCategoryId(category.id)}
            >
              <span className="category-book-spine" aria-hidden="true" />
              <BookOpen size={28} aria-hidden="true" />
              <span className="category-book-copy">
                <strong>{category.label}</strong>
                <span>{category.description}</span>
              </span>
              <span className="category-book-count">
                {category.templateCount} {category.templateCount === 1 ? "strategy" : "strategies"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          title={research.isLoading ? "Loading the field guide" : "No strategy categories available"}
          body={research.isLoading ? "Reading public strategy metadata from poe.how." : "Refresh the guide or start a custom study."}
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
  const canReport = canReportRun(run);
  const describedItemSearchResults = describeCatalogItemSearchResults(research.itemSearchResults);

  return (
    <section className="research-layout">
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
        {canReport ? (
          <>
            <button type="button" onClick={() => void research.saveDraft()}>
              <FileDown size={18} /> Save draft
            </button>
            <button className="primary-button" type="button" onClick={() => void research.copyDraft()}>
              <ClipboardCopy size={18} /> Copy Codex draft
            </button>
          </>
        ) : null}
      </div>

      <div className="panel active-study-header">
        <div>
          <span className="eyebrow">{isDetectedEncounter ? "Encounter detected from Client.txt" : (run.template?.categoryName ?? "Custom field study")}</span>
          <h2>{isDetectedEncounter ? `Log loot: ${run.title.replace(/ drops$/i, "")}` : run.title}</h2>
          <p>{run.template?.description ?? "Locally collected research notes ready for Codex handoff."}</p>
          {!canReport ? <p>Fixed-result strategies are local notes only and cannot be reported to poe.how.</p> : null}
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
          <p>Catalog identities come from poe.how; game tooltip data is local, and valuation comes from poe.ninja or poe.watch.</p>
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
        {describedItemSearchResults.length > 0 ? (
          <div className="item-search-results">
            {describedItemSearchResults.map(({ item, metadata }) => (
              <div className="item-search-result" key={item.detailsId}>
                <ItemHover
                  className="research-artwork-hover-trigger"
                  data={createResearchItemHoverData({
                    name: item.name,
                    category: item.itemType ?? item.category ?? undefined,
                    baseType: item.baseType,
                    icon: item.icon,
                    detailsId: item.detailsId,
                    metadata,
                    gameData: item.gameData
                  })}
                >
                  <ItemArtwork name={item.name} icon={item.icon} />
                </ItemHover>
                <div className="item-search-result-copy">
                  <strong>{item.name}</strong>
                  {metadata ? <span>{metadata}</span> : null}
                </div>
                <div>
                  <button type="button" onClick={() => research.addItem("requirement", item)}>+ Input</button>
                  <button type="button" onClick={() => research.addItem("reward", item)}>+ Reward</button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
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
                <ItemHover
                  className="research-artwork-hover-trigger"
                  data={createResearchItemHoverData({
                    name: item.name,
                    category: "Encounter reward",
                    baseType: item.baseType,
                    icon: item.icon,
                    detailsId: item.detailsId,
                    amount: item.amount,
                    gameData: item.gameData,
                    quote: research.marketQuotes[item.detailsId]
                  })}
                  focusable={false}
                >
                  <ItemArtwork name={item.name} icon={item.icon} large />
                </ItemHover>
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
      <div className="run-item-group-heading">
        <h3>{title}</h3>
        <span>{items.length} {items.length === 1 ? "item" : "items"}</span>
      </div>
      <div className="run-item-list">
        {items.length === 0 ? <p className="muted-copy">No items recorded.</p> : null}
        {items.map((item) => (
          <div className="run-item-row" key={item.id}>
            <div>
              <ItemHover
                className="run-item-hover-trigger"
                data={createResearchItemHoverData({
                  name: item.name,
                  category: item.itemType ?? item.category ?? (item.role === "requirement" ? "Requirement" : "Reward"),
                  baseType: item.baseType,
                  icon: item.icon,
                  detailsId: item.detailsId,
                  amount: item.amount,
                  gameData: item.gameData,
                  quote: research.marketQuotes[item.detailsId],
                  provenance: item.provenance
                })}
              >
                <strong>{item.name}</strong>
              </ItemHover>
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
      </div>
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

function createResearchItemHoverData({
  amount,
  baseType,
  category,
  detailsId,
  icon,
  gameData,
  metadata,
  name,
  provenance,
  quote
}: {
  amount?: number;
  baseType?: string;
  category?: string;
  detailsId: string;
  icon?: string;
  gameData?: ItemGameData;
  metadata?: string;
  name: string;
  provenance?: string;
  quote?: ResearchRuns["marketQuotes"][string];
}): ItemHoverData {
  const resolvedGameData = resolveItemTooltipData(name, baseType, gameData);
  const stats: ItemHoverData["stats"] = [];

  if (quote) {
    stats.push(
      { label: "Unit value", value: `${quote.chaosValue.toFixed(1)} chaos`, tone: "good" },
      ...(amount === undefined
        ? []
        : [{ label: "Recorded value", value: `${(quote.chaosValue * amount).toFixed(1)} chaos`, tone: "good" as const }]),
      { label: "Price source", value: quote.source === "poe-watch" ? "poe.watch" : "poe.ninja" },
      { label: "Confidence", value: quote.confidence }
    );
  } else {
    stats.push({ label: "Market value", value: "Not priced", tone: "muted" });
  }

  if (amount !== undefined) stats.push({ label: "Recorded", value: amount.toLocaleString(), tone: "accent" });
  if (provenance) stats.push({ label: "Provenance", value: provenance });
  if (metadata) stats.push({ label: "Catalog", value: metadata });
  stats.push({ label: "Details ID", value: detailsId, tone: "muted" });

  return {
    name,
    category: resolvedGameData ? undefined : (category ? humanizeItemLabel(category) : "Path of Exile item"),
    baseType,
    imageSrc: icon,
    imageAlt: `${name} item artwork`,
    imageFit: "contain",
    imagePlacement: "before-details",
    primaryDetails: resolvedGameData ? <GameItemDetails data={resolvedGameData} /> : undefined,
    rarity: resolveItemRarity(resolvedGameData, category),
    stats,
    footer: quote ? "Direct market estimate for the selected league." : "Add the item to a study and refresh market values to price it."
  };
}

function resolveItemRarity(gameData: ItemGameData | undefined, category: string | undefined): ItemHoverRarity {
  const rarity = gameData?.rarity?.toLowerCase();
  if (rarity === "unique" || rarity === "rare" || rarity === "magic" || rarity === "normal") return rarity;
  const classification = category?.toLowerCase() ?? "";
  if (classification.includes("currency")) return "currency";
  if (classification.includes("gem")) return "gem";
  return "normal";
}

function humanizeItemLabel(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
