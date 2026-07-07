import { describe, expect, it } from "vitest";
import { buildSessions } from "./sessions.js";
import type { ClientLogDraw, PriceSnapshot } from "./types.js";

describe("buildSessions", () => {
  it("prices sessions with the selected price league instead of the dated session league", () => {
    const sessions = buildSessions([makeDraw("2025-11-01T12:07:45Z", "The Lover")], {
      keepers: makeSnapshot("keepers", "Keepers", 1, 1),
      mirage: makeSnapshot("mirage", "Mirage", 10, 2)
    }, {}, {
      pricingLeagueId: "mirage"
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0].leagueId).toBe("keepers");
    expect(sessions[0].cards[0]).toMatchObject({
      name: "The Lover",
      priceChaos: 10,
      totalChaos: 10
    });
    expect(sessions[0].totalValueChaos).toBe(10);
    expect(sessions[0].stackedDeckCostChaos).toBe(2);
    expect(sessions[0].profitChaos).toBe(8);
  });

  it("falls back to the session league when no price league is selected", () => {
    const sessions = buildSessions([makeDraw("2025-11-01T12:07:45Z", "The Lover")], {
      keepers: makeSnapshot("keepers", "Keepers", 1, 1),
      mirage: makeSnapshot("mirage", "Mirage", 10, 2)
    });

    expect(sessions[0].leagueId).toBe("keepers");
    expect(sessions[0].cards[0].priceChaos).toBe(1);
    expect(sessions[0].profitChaos).toBe(0);
  });
});

function makeDraw(timestamp: string, cardName: string): ClientLogDraw {
  return {
    id: `${timestamp}-${cardName}`,
    lineNumber: 1,
    timestamp,
    cardName
  };
}

function makeSnapshot(leagueId: string, leagueName: string, cardChaos: number, deckChaos: number): PriceSnapshot {
  return {
    leagueId,
    leagueName,
    poeNinjaLeague: leagueName,
    fetchedAt: "2026-07-07T10:00:00Z",
    expiresAt: "2026-07-07T22:00:00Z",
    fromCache: false,
    sourceUrls: {
      cards: `https://example.test/${leagueId}/cards`,
      stackedDeck: `https://example.test/${leagueId}/stacked-deck`
    },
    stackedDeck: {
      id: "stacked-deck",
      name: "Stacked Deck",
      detailsId: "stacked-deck",
      chaosValue: deckChaos
    },
    cards: {
      "the lover": {
        id: "the-lover",
        name: "The Lover",
        detailsId: "the-lover",
        chaosValue: cardChaos
      }
    }
  };
}
