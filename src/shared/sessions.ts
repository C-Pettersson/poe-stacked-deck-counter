import { getLeagueById, matchLeagueByDate } from "./leagues.js";
import { getCardPrice } from "./pricing.js";
import { DEFAULT_PROFIT_FILTERS, getIncludedValueChaos, hasCardPriceConfidence } from "./profitFilters.js";
import type { ClientLogDraw, DeckSession, PriceSnapshot, ProfitFilters, SessionCard } from "./types.js";

export const SESSION_GAP_MS = 2 * 60 * 60 * 1000;
type PriceSource = PriceSnapshot | Record<string, PriceSnapshot> | null;

interface BuildSessionsOptions {
  pricingLeagueId?: string;
  fixedStackedDeckPriceChaos?: number | null;
  profitFilters?: ProfitFilters;
}

export function buildSessions(
  draws: ClientLogDraw[],
  priceSnapshot: PriceSource,
  overrides: Record<string, string> = {},
  options: BuildSessionsOptions = {}
): DeckSession[] {
  const sorted = [...draws].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const groups: ClientLogDraw[][] = [];

  for (const draw of sorted) {
    const previousGroup = groups.at(-1);
    const previousDraw = previousGroup?.at(-1);
    const startsNewGroup =
      !previousDraw || Date.parse(draw.timestamp) - Date.parse(previousDraw.timestamp) > SESSION_GAP_MS;

    if (startsNewGroup || !previousGroup) {
      groups.push([draw]);
    } else {
      previousGroup.push(draw);
    }
  }

  return groups.map((group, index) => {
    const startAt = group[0].timestamp;
    const endAt = group[group.length - 1].timestamp;
    const autoLeague = matchLeagueByDate(startAt) ?? getLeagueById("standard");
    const temporaryId = createSessionId(startAt, index);
    const overrideLeague = overrides[temporaryId] ? getLeagueById(overrides[temporaryId]) : null;
    const league = overrideLeague ?? autoLeague;
    const source = overrideLeague ? "manual" : "auto";
    const pricingLeagueId = options.pricingLeagueId ?? league.id;
    const profitFilters = options.profitFilters ?? DEFAULT_PROFIT_FILTERS;
    const priced = selectSnapshot(priceSnapshot, pricingLeagueId);
    const cards = buildSessionCards(group, priced, profitFilters);
    const totalValueChaos = cards.reduce((total, card) => total + (card.includedValueChaos ?? 0), 0);
    const stackedDeckCostChaos = getStackedDeckPriceChaos(priced, options.fixedStackedDeckPriceChaos) * group.length;
    const missingPrices = cards.filter((card) => card.priceChaos === null).length;

    return {
      id: temporaryId,
      startAt,
      endAt,
      leagueId: league.id,
      leagueName: league.name,
      poeNinjaLeague: league.poeNinjaName,
      pricingLeagueId,
      source,
      draws: group,
      cards,
      totalCards: group.length,
      uniqueCards: cards.length,
      totalValueChaos,
      stackedDeckCostChaos,
      profitChaos: totalValueChaos - stackedDeckCostChaos,
      pricedCards: cards.length - missingPrices,
      missingPrices
    };
  });
}

function selectSnapshot(source: PriceSource, leagueId: string): PriceSnapshot | null {
  if (!source) {
    return null;
  }

  if (isPriceSnapshot(source)) {
    return source.leagueId === leagueId ? source : null;
  }

  return source[leagueId] ?? null;
}

function isPriceSnapshot(source: PriceSnapshot | Record<string, PriceSnapshot>): source is PriceSnapshot {
  return "leagueId" in source && "cards" in source && "fetchedAt" in source;
}

function getStackedDeckPriceChaos(snapshot: PriceSnapshot | null, fixedPriceChaos: number | null | undefined): number {
  if (typeof fixedPriceChaos === "number" && Number.isFinite(fixedPriceChaos) && fixedPriceChaos >= 0) {
    return fixedPriceChaos;
  }

  return snapshot?.stackedDeck?.chaosValue ?? 0;
}

export function createSessionId(startAt: string, index: number): string {
  return `session-${startAt.replace(/[:.]/g, "-")}-${index + 1}`;
}

export function rollupCards(sessions: DeckSession[]): SessionCard[] {
  const byName = new Map<string, SessionCard>();

  for (const session of sessions) {
    for (const card of session.cards) {
      const existing = byName.get(card.name);
      if (!existing) {
        byName.set(card.name, { ...card });
        continue;
      }

      existing.count += card.count;
      existing.totalChaos =
        existing.totalChaos !== null || card.totalChaos !== null
          ? (existing.totalChaos ?? 0) + (card.totalChaos ?? 0)
          : null;
    }
  }

  return [...byName.values()].sort((a, b) => (b.totalChaos ?? 0) - (a.totalChaos ?? 0));
}

function buildSessionCards(
  draws: ClientLogDraw[],
  snapshot: PriceSnapshot | null,
  profitFilters: ProfitFilters
): SessionCard[] {
  const counts = new Map<string, number>();

  for (const draw of draws) {
    counts.set(draw.cardName, (counts.get(draw.cardName) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => {
      const price = getCardPrice(snapshot, name);
      const priceChaos = price?.chaosValue ?? null;
      const totalChaos = price ? price.chaosValue * count : null;
      const hasPriceConfidence = price ? hasCardPriceConfidence(price) : undefined;
      const included = getIncludedValueChaos({ priceChaos, totalChaos, hasPriceConfidence }, profitFilters);

      return {
        name,
        count,
        priceChaos,
        totalChaos,
        includedValueChaos: included.valueChaos,
        exclusionReason: included.reason,
        hasPriceConfidence,
        detailsId: price?.detailsId,
        icon: price?.icon,
        change7d: price?.change7d ?? null
      };
    })
    .sort((a, b) => (b.totalChaos ?? 0) - (a.totalChaos ?? 0) || b.count - a.count || a.name.localeCompare(b.name));
}
