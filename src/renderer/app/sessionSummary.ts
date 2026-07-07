import type { DeckSession, PriceSnapshot } from "../../shared/types.js";

export type SessionSummary = {
  sessions: number;
  cards: number;
  value: number;
  cost: number;
  profit: number;
};

export function getSessionCurrencySnapshot(
  session: DeckSession,
  priceSnapshots: Record<string, PriceSnapshot>,
  fallback: PriceSnapshot | undefined
): PriceSnapshot | undefined {
  return priceSnapshots[session.pricingLeagueId ?? session.leagueId] ?? fallback;
}

export function getSessionsCurrencySnapshot(
  sessions: DeckSession[],
  priceSnapshots: Record<string, PriceSnapshot>,
  fallback: PriceSnapshot | undefined
): PriceSnapshot | undefined {
  const pricingLeagueIds = new Set(sessions.map((session) => session.pricingLeagueId ?? session.leagueId));

  if (pricingLeagueIds.size === 1) {
    const pricingLeagueId = [...pricingLeagueIds][0];
    return pricingLeagueId ? priceSnapshots[pricingLeagueId] ?? fallback : fallback;
  }

  return fallback;
}

export function summarizeSessions(sessions: DeckSession[]): SessionSummary {
  return sessions.reduce(
    (summary, session) => ({
      sessions: summary.sessions + 1,
      cards: summary.cards + session.totalCards,
      value: summary.value + session.totalValueChaos,
      cost: summary.cost + session.stackedDeckCostChaos,
      profit: summary.profit + session.profitChaos
    }),
    { sessions: 0, cards: 0, value: 0, cost: 0, profit: 0 }
  );
}
