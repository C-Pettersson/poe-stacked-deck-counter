import type { CollectionRun, RunLifecycle } from "../domain/collection.js";

export type StudyTypeId = "stacked-decks" | "encounters" | "other";
export type StudyTypeFilter = "all" | StudyTypeId;

export interface StudyTypePresentation {
  id: StudyTypeId;
  label: string;
  description: string;
  bookClassName: string;
  symbol: string;
}

export interface InsightModule {
  id: "stacked-decks";
  label: string;
  description: string;
  studyTypeId: StudyTypeId;
}

export interface RunLibraryFilters {
  query: string;
  studyType: StudyTypeFilter;
  lifecycle: "all" | RunLifecycle;
}

export interface RunShelf {
  studyType: StudyTypePresentation;
  runs: CollectionRun[];
}

export const STUDY_TYPES: readonly StudyTypePresentation[] = [
  {
    id: "stacked-decks",
    label: "Stacked Decks",
    description: "Observed deck-opening studies and their card results.",
    bookClassName: "stacked-decks",
    symbol: "SD"
  },
  {
    id: "encounters",
    label: "Encounters",
    description: "Detected boss visits and manually recorded encounter outcomes.",
    bookClassName: "encounters",
    symbol: "EN"
  },
  {
    id: "other",
    label: "Other Studies",
    description: "Custom studies and other strategy research.",
    bookClassName: "other",
    symbol: "RS"
  }
];

export const INSIGHT_MODULES: readonly InsightModule[] = [
  {
    id: "stacked-decks",
    label: "Stacked Decks",
    description: "Aggregate card frequency, value, and league results across deck-opening runs.",
    studyTypeId: "stacked-decks"
  }
];

export function getStudyType(run: CollectionRun): StudyTypePresentation {
  const id = getStudyTypeId(run);
  return STUDY_TYPES.find((studyType) => studyType.id === id) ?? STUDY_TYPES[STUDY_TYPES.length - 1];
}

export function getStudyTypeId(run: CollectionRun): StudyTypeId {
  if (run.id.startsWith("stacked-deck:") || run.template?.name === "stacked-deck" || run.template?.name === "stacked-decks") {
    return "stacked-decks";
  }

  const templateClassification = `${run.template?.name ?? ""} ${run.template?.categoryName ?? ""}`.toLocaleLowerCase();
  if (
    run.id.startsWith("client-log-") ||
    run.template?.name.startsWith("client-log-") ||
    ["boss", "encounter", "invitation"].some((term) => templateClassification.includes(term))
  ) {
    return "encounters";
  }

  return "other";
}

export function getStackedDeckSessionId(run: CollectionRun): string | null {
  return getStudyTypeId(run) === "stacked-decks" && run.id.startsWith("stacked-deck:")
    ? run.id.slice("stacked-deck:".length)
    : null;
}

export function buildRunShelves(runs: CollectionRun[], filters: RunLibraryFilters): RunShelf[] {
  const query = filters.query.trim().toLocaleLowerCase();
  const visibleRuns = runs
    .filter((run) => filters.lifecycle === "all" || run.lifecycle === filters.lifecycle)
    .filter((run) => filters.studyType === "all" || getStudyTypeId(run) === filters.studyType)
    .filter((run) => {
      if (!query) return true;
      return [run.title, run.template?.name, run.template?.categoryName, run.notes]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase().includes(query));
    })
    .sort(compareRunsNewestFirst);

  return STUDY_TYPES.map((studyType) => ({
    studyType,
    runs: visibleRuns.filter((run) => getStudyTypeId(run) === studyType.id)
  })).filter((shelf) => shelf.runs.length > 0);
}

function compareRunsNewestFirst(a: CollectionRun, b: CollectionRun): number {
  const aDate = Date.parse(a.startedAt ?? a.createdAt);
  const bDate = Date.parse(b.startedAt ?? b.createdAt);
  return bDate - aDate || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
}
