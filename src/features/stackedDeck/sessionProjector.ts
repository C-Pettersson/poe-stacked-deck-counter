import type { CollectionRun, TemplateSnapshot } from "../../domain/collection.js";
import { detailsIdFromName } from "../../shared/pricing.js";
import {
  buildSessions,
  type BuildSessionsOptions
} from "../../shared/sessions.js";
import type { ClientLogDraw, DeckSession, PriceSnapshot } from "../../shared/types.js";

type LegacyPriceInput = PriceSnapshot | Record<string, PriceSnapshot> | null;

export function projectStackedDeckSessions(
  draws: ClientLogDraw[],
  priceSnapshot: LegacyPriceInput,
  overrides: Record<string, string> = {},
  options: BuildSessionsOptions = {}
): DeckSession[] {
  return buildSessions(draws, priceSnapshot, overrides, options);
}

export function projectStackedDeckRun(
  session: DeckSession,
  template: TemplateSnapshot | null = null,
  now = new Date()
): CollectionRun {
  const startedAt = session.startAt;
  const endedAt = session.endAt;
  return {
    id: `stacked-deck:${session.id}`,
    title: `Stacked Deck field study — ${startedAt.slice(0, 10)}`,
    template,
    leagueId: session.leagueId,
    gameVersion: "",
    runCount: session.totalCards,
    durationSeconds: Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000)),
    notes: "Projected from locally observed stacked-deck draw events.",
    lifecycle: "completed",
    origin: "detector",
    startedAt,
    endedAt,
    createdAt: startedAt,
    updatedAt: now.toISOString(),
    items: [
      {
        id: `${session.id}:input`,
        role: "requirement",
        detailsId: "stacked-deck",
        name: "Stacked Deck",
        amount: session.totalCards,
        provenance: "detector"
      },
      ...session.cards.map((card) => ({
        id: `${session.id}:reward:${card.detailsId ?? detailsIdFromName(card.name)}`,
        role: "reward" as const,
        detailsId: card.detailsId ?? detailsIdFromName(card.name),
        name: card.name,
        amount: card.count,
        provenance: "detector" as const,
        icon: card.icon
      }))
    ],
    observationIds: session.draws.map((draw) => draw.id)
  };
}
