import {
  createRunItem,
  normalizeItemAmount,
  normalizeRunCount,
  touchRun,
  type CatalogItem,
  type CollectionRun,
  type RunItemRole
} from "../domain/collection.js";

export function startRun(run: CollectionRun, now = new Date()): CollectionRun {
  if (run.lifecycle === "archived") {
    throw new Error("Archived field studies cannot be started.");
  }

  return touchRun(run, {
    lifecycle: "active",
    startedAt: run.startedAt ?? now.toISOString(),
    endedAt: undefined
  }, now);
}

export function completeRun(run: CollectionRun, now = new Date()): CollectionRun {
  const endedAt = now.toISOString();
  const durationSeconds = run.durationSeconds ?? calculateDuration(run.startedAt, endedAt);

  return touchRun(run, {
    lifecycle: "completed",
    endedAt,
    durationSeconds
  }, now);
}

export function archiveRun(run: CollectionRun, now = new Date()): CollectionRun {
  return touchRun(run, { lifecycle: "archived" }, now);
}

export function resumeRun(run: CollectionRun, now = new Date()): CollectionRun {
  return touchRun(run, { lifecycle: "draft" }, now);
}

export function updateRunDetails(
  run: CollectionRun,
  changes: Partial<Pick<CollectionRun, "title" | "leagueId" | "gameVersion" | "notes" | "runCount" | "durationSeconds">>,
  now = new Date()
): CollectionRun {
  return touchRun(run, {
    ...changes,
    title: changes.title === undefined ? run.title : changes.title.trim() || "Untitled field study",
    runCount: changes.runCount === undefined ? run.runCount : normalizeRunCount(changes.runCount),
    durationSeconds:
      changes.durationSeconds === undefined
        ? run.durationSeconds
        : Number.isFinite(changes.durationSeconds) && changes.durationSeconds >= 0
          ? changes.durationSeconds
          : undefined
  }, now);
}

export function addRunItem(run: CollectionRun, role: RunItemRole, item: CatalogItem, now = new Date()): CollectionRun {
  const existing = run.items.find((entry) => entry.role === role && entry.detailsId === item.detailsId);
  if (existing) {
    return updateRunItemAmount(run, existing.id, existing.amount + 1, now);
  }

  return touchRun(run, { items: [...run.items, createRunItem(role, item)] }, now);
}

export function updateRunItemAmount(run: CollectionRun, itemId: string, amount: number, now = new Date()): CollectionRun {
  return touchRun(run, {
    items: run.items.map((item) => (item.id === itemId ? { ...item, amount: normalizeItemAmount(amount) } : item))
  }, now);
}

export function removeRunItem(run: CollectionRun, itemId: string, now = new Date()): CollectionRun {
  return touchRun(run, { items: run.items.filter((item) => item.id !== itemId) }, now);
}

function calculateDuration(startedAt: string | undefined, endedAt: string): number | undefined {
  if (!startedAt) {
    return undefined;
  }

  const duration = Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000);
  return Number.isFinite(duration) && duration >= 0 ? duration : undefined;
}
