import type { CollectionRun, RunItem } from "../domain/collection.js";

export const CODEX_DRAFT_KIND = "poehow.codex-draft";
export const CODEX_DRAFT_SCHEMA_VERSION = 3;

export interface CodexDraftV3 {
  kind: typeof CODEX_DRAFT_KIND;
  schemaVersion: typeof CODEX_DRAFT_SCHEMA_VERSION;
  source: {
    app: "wraeclast-field-notes";
    version: string;
    collectionSource: "manual" | "log_file" | "imported";
  };
  exportedAt: string;
  run: {
    id: string;
    title: string;
    templateName?: string;
    templateRevision?: string;
    leagueId?: string;
    gameVersion?: string;
    runs: number;
    duration?: number;
    comment?: string;
    requirements: CodexDraftItem[];
    rewards: CodexDraftItem[];
    evidence: {
      observationCount: number;
      detectorAssisted: boolean;
    };
  };
}

export interface CodexDraftItem {
  itemDetailsId: string;
  itemName: string;
  amount: number;
  comment?: string;
  templateItemId?: number;
  provenance: RunItem["provenance"];
}

export function createCodexDraftV3(run: CollectionRun, appVersion: string, now = new Date()): CodexDraftV3 {
  return {
    kind: CODEX_DRAFT_KIND,
    schemaVersion: CODEX_DRAFT_SCHEMA_VERSION,
    source: {
      app: "wraeclast-field-notes",
      version: appVersion,
      collectionSource: run.origin === "detector" ? "log_file" : run.origin
    },
    exportedAt: now.toISOString(),
    run: {
      id: run.id,
      title: run.title,
      templateName: run.template?.name,
      templateRevision: run.template?.revision,
      leagueId: run.leagueId || undefined,
      gameVersion: run.gameVersion || undefined,
      runs: run.runCount,
      duration: run.durationSeconds,
      comment: run.notes.trim() || undefined,
      requirements: run.items.filter((item) => item.role === "requirement" && item.amount > 0).map(toDraftItem),
      rewards: run.items.filter((item) => item.role === "reward" && item.amount > 0).map(toDraftItem),
      evidence: {
        observationCount: run.observationIds.length,
        detectorAssisted: run.origin === "detector" || run.observationIds.length > 0
      }
    }
  };
}

export function stringifyCodexDraft(draft: CodexDraftV3): string {
  return `${JSON.stringify(draft, null, 2)}\n`;
}

function toDraftItem(item: RunItem): CodexDraftItem {
  return {
    itemDetailsId: item.detailsId,
    itemName: item.name,
    amount: item.amount,
    comment: item.comment,
    templateItemId: item.templateItemId,
    provenance: item.provenance
  };
}
