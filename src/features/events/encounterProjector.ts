import { createCollectionRun, type CatalogItem, type CollectionRun, type TemplateItem, type TemplateSnapshot } from "../../domain/collection.js";
import type { ClientLogEncounter } from "../../shared/types.js";
import { getEncounterDefinition } from "./encounterCatalog.js";

export function projectClientLogEncounter(
  encounter: ClientLogEncounter,
  templates: TemplateSnapshot[],
  defaults: { leagueId?: string; gameVersion?: string } = {}
): CollectionRun {
  const definition = getEncounterDefinition(encounter.encounterId);
  const catalogTemplate = findTemplate(encounter, templates);
  const detectorTemplate = definition ? createDetectorTemplate(definition) : null;
  const template = catalogTemplate
    ? {
        ...catalogTemplate,
        wikiUrl: definition?.wikiUrl ?? catalogTemplate.wikiUrl,
        poedbUrl: definition?.poedbUrl ?? catalogTemplate.poedbUrl,
        rewards: catalogTemplate.rewards.length > 0 ? catalogTemplate.rewards : (detectorTemplate?.rewards ?? [])
      }
    : detectorTemplate;
  const run = createCollectionRun(template, {
    leagueId: defaults.leagueId,
    gameVersion: defaults.gameVersion,
    now: new Date(encounter.startedAt)
  });
  const durationSeconds = Math.max(0, Math.round((Date.parse(encounter.endedAt) - Date.parse(encounter.startedAt)) / 1000));
  const confirmation = encounter.completionAt
    ? "A known encounter-completion voice line was detected before departure."
    : "Zone departure was detected; Client.txt did not provide a reliable boss-kill confirmation.";

  return {
    ...run,
    id: `client-log-${encounter.id}`,
    title: `${encounter.title} drops`,
    lifecycle: "draft",
    origin: "detector",
    startedAt: encounter.startedAt,
    endedAt: encounter.endedAt,
    durationSeconds,
    notes: confirmation,
    observationIds: [encounter.id]
  };
}

function findTemplate(encounter: ClientLogEncounter, templates: TemplateSnapshot[]): TemplateSnapshot | null {
  const terms = [encounter.encounterId, encounter.title, encounter.boss].map(normalize);
  return templates.find((template) => {
    const haystack = normalize(`${template.name} ${template.title}`);
    return terms.some((term) => term.length >= 4 && haystack.includes(term));
  }) ?? null;
}

function createDetectorTemplate(definition: NonNullable<ReturnType<typeof getEncounterDefinition>>): TemplateSnapshot {
  return {
    id: 1_000_000 + definition.id.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0),
    name: `client-log-${definition.id}`,
    title: definition.title,
    description: `Automatically detected after leaving ${definition.areaNames[0]}. Tap each drop to record it.`,
    revision: "client-log-events-v1",
    categoryId: null,
    categoryName: "Automatic encounter",
    fixedResult: false,
    allowRequirementSubmission: false,
    requirements: [],
    rewards: (definition.rewards ?? []).map(toTemplateItem),
    wikiUrl: definition.wikiUrl,
    poedbUrl: definition.poedbUrl
  };
}

function toTemplateItem(item: CatalogItem): TemplateItem {
  return { item, amount: 1 };
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-");
}
