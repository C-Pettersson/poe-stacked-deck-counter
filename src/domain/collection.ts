export type RunLifecycle = "draft" | "active" | "completed" | "archived";
export type RunOrigin = "manual" | "detector" | "imported";
export type RunItemRole = "requirement" | "reward";
export type RunItemProvenance = "template" | "manual" | "detector" | "imported";

export interface CatalogCategory {
  id: number;
  name: string;
  label: string;
  description: string;
  icon?: string;
}

export interface CatalogItem {
  detailsId: string;
  name: string;
  baseType?: string;
  category?: string | null;
  itemType?: string;
  icon?: string;
  tags?: CatalogItemTag[];
  gameData?: ItemGameData;
}

import type { GameItemData } from "../itemTooltip/model.js";
export type ItemGameData = GameItemData;

export interface CatalogItemTag {
  name: string;
  hidden?: boolean;
}

export interface TemplateItem {
  id?: number;
  item: CatalogItem;
  amount: number;
  comment?: string;
  group?: number;
  weight?: number;
  exclusiveGroup?: number;
}

export interface TemplateSnapshot {
  id: number;
  name: string;
  title: string;
  description: string;
  revision: string;
  categoryId: number | null;
  categoryName?: string;
  image?: string;
  wikiUrl?: string;
  poedbUrl?: string;
  fixedResult: boolean;
  allowRequirementSubmission: boolean;
  requirements: TemplateItem[];
  rewards: TemplateItem[];
}

export interface CatalogLeague {
  id: string;
  name: string;
  displayName: string;
}

export interface CatalogReleaseVersion {
  id: string;
  version: string;
  name: string;
  current: boolean;
  active: boolean;
}

export interface CatalogSnapshot {
  fetchedAt: string;
  expiresAt: string;
  templates: TemplateSnapshot[];
  categories: CatalogCategory[];
  leagues: CatalogLeague[];
  releaseVersions: CatalogReleaseVersion[];
  fromCache: boolean;
}

export interface RunItem {
  id: string;
  role: RunItemRole;
  detailsId: string;
  name: string;
  amount: number;
  provenance: RunItemProvenance;
  templateItemId?: number;
  comment?: string;
  icon?: string;
  baseType?: string;
  category?: string | null;
  itemType?: string;
  gameData?: ItemGameData;
  priceOverrideChaos?: number;
}

export interface Observation {
  id: string;
  sourceId: string;
  detectorId: string;
  kind: string;
  occurredAt: string;
  lineNumber?: number;
  byteOffset?: number;
  confidence: "high" | "medium" | "low";
  payload: Record<string, unknown>;
}

export interface CollectionRun {
  id: string;
  title: string;
  template: TemplateSnapshot | null;
  leagueId: string;
  gameVersion: string;
  runCount: number;
  durationSeconds?: number;
  notes: string;
  lifecycle: RunLifecycle;
  origin: RunOrigin;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
  exportedAt?: string;
  items: RunItem[];
  observationIds: string[];
}

export function createCollectionRun(
  template: TemplateSnapshot | null,
  defaults: { leagueId?: string; gameVersion?: string; now?: Date } = {}
): CollectionRun {
  const now = (defaults.now ?? new Date()).toISOString();

  return {
    id: createId("run"),
    title: template?.title ?? "Untitled field study",
    template,
    leagueId: defaults.leagueId ?? "",
    gameVersion: defaults.gameVersion ?? "",
    runCount: 1,
    notes: "",
    lifecycle: "draft",
    origin: "manual",
    createdAt: now,
    updatedAt: now,
    items: [
      ...(template?.requirements.map((entry) => createRunItem("requirement", entry, "template")) ?? []),
      ...(template?.rewards.map((entry) => ({ ...createRunItem("reward", entry, "template"), amount: 0 })) ?? [])
    ],
    observationIds: []
  };
}

export function createRunItem(
  role: RunItemRole,
  templateItem: TemplateItem | CatalogItem,
  provenance: RunItemProvenance = "manual"
): RunItem {
  const entry: TemplateItem | null = "item" in templateItem ? templateItem : null;
  const item: CatalogItem = entry ? entry.item : (templateItem as CatalogItem);

  return {
    id: createId("item"),
    role,
    detailsId: item.detailsId,
    name: item.name,
    amount: entry?.amount ?? 1,
    provenance,
    templateItemId: entry?.id,
    comment: entry?.comment,
    icon: item.icon,
    baseType: item.baseType,
    category: item.category,
    itemType: item.itemType,
    gameData: item.gameData
  };
}

export function touchRun(run: CollectionRun, changes: Partial<CollectionRun>, now = new Date()): CollectionRun {
  return {
    ...run,
    ...changes,
    id: run.id,
    createdAt: run.createdAt,
    updatedAt: now.toISOString()
  };
}

export function normalizeRunCount(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 1;
}

export function normalizeItemAmount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function createId(prefix: string): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
