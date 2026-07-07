import { describe, expect, it } from "vitest";
import { buildSessions, updateSessionLeagueOverrides } from "./sessions.js";
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

  it("applies a manual session league override", () => {
    const sessionId = "session-2025-11-01T12-07-45Z-1";
    const sessions = buildSessions([makeDraw("2025-11-01T12:07:45Z", "The Lover")], null, {
      [sessionId]: "mirage"
    });

    expect(sessions[0]).toMatchObject({
      id: sessionId,
      leagueId: "mirage",
      leagueName: "Mirage",
      source: "manual"
    });
  });

  it("keeps the auto league source when an override matches the detected league", () => {
    const sessionId = "session-2025-11-01T12-07-45Z-1";
    const sessions = buildSessions([makeDraw("2025-11-01T12:07:45Z", "The Lover")], null, {
      [sessionId]: "keepers"
    });

    expect(sessions[0]).toMatchObject({
      leagueId: "keepers",
      source: "auto"
    });
  });

  it("ignores invalid persisted session league overrides", () => {
    const sessionId = "session-2025-11-01T12-07-45Z-1";
    const sessions = buildSessions([makeDraw("2025-11-01T12:07:45Z", "The Lover")], null, {
      [sessionId]: "missing-league"
    });

    expect(sessions[0]).toMatchObject({
      leagueId: "keepers",
      source: "auto"
    });
  });

  it("updates session league overrides by session id and clears auto matches", () => {
    const session = {
      id: "session-2025-11-01T12-07-45Z-1",
      startAt: "2025-11-01T12:07:45Z"
    };

    const overridden = updateSessionLeagueOverrides({}, session, "mirage");
    expect(overridden).toEqual({ [session.id]: "mirage" });

    const restoredAuto = updateSessionLeagueOverrides(overridden, session, "keepers");
    expect(restoredAuto).toEqual({});
  });

  it("uses a fixed stacked deck price when one is configured", () => {
    const sessions = buildSessions(
      [makeDraw("2025-11-01T12:07:45Z", "The Lover"), makeDraw("2025-11-01T12:07:46Z", "The Lover")],
      {
        mirage: makeSnapshot("mirage", "Mirage", 10, 2)
      },
      {},
      {
        fixedStackedDeckPriceChaos: 1.5,
        pricingLeagueId: "mirage"
      }
    );

    expect(sessions[0].stackedDeckCostChaos).toBe(3);
    expect(sessions[0].profitChaos).toBe(17);
  });

  it("allows a fixed zero stacked deck price", () => {
    const sessions = buildSessions(
      [makeDraw("2025-11-01T12:07:45Z", "The Lover")],
      {
        mirage: makeSnapshot("mirage", "Mirage", 10, 2)
      },
      {},
      {
        fixedStackedDeckPriceChaos: 0,
        pricingLeagueId: "mirage"
      }
    );

    expect(sessions[0].stackedDeckCostChaos).toBe(0);
    expect(sessions[0].profitChaos).toBe(10);
  });

  it("excludes cards below the minimum card value from profit", () => {
    const sessions = buildSessions(
      [makeDraw("2025-11-01T12:07:45Z", "The Lover")],
      {
        mirage: makeSnapshot("mirage", "Mirage", 4, 1)
      },
      {},
      {
        pricingLeagueId: "mirage",
        profitFilters: {
          minimumCardValueChaos: 5,
          minimumStackValueChaos: 0,
          requireConfidence: false
        }
      }
    );

    expect(sessions[0].cards[0]).toMatchObject({
      priceChaos: 4,
      totalChaos: 4,
      includedValueChaos: 0,
      exclusionReason: "card-value"
    });
    expect(sessions[0].totalValueChaos).toBe(0);
    expect(sessions[0].profitChaos).toBe(-1);
  });

  it("excludes card stacks below the minimum stack value from profit", () => {
    const sessions = buildSessions(
      [makeDraw("2025-11-01T12:07:45Z", "The Lover"), makeDraw("2025-11-01T12:07:46Z", "The Lover")],
      {
        mirage: makeSnapshot("mirage", "Mirage", 3, 1)
      },
      {},
      {
        pricingLeagueId: "mirage",
        profitFilters: {
          minimumCardValueChaos: 0,
          minimumStackValueChaos: 7,
          requireConfidence: false
        }
      }
    );

    expect(sessions[0].cards[0]).toMatchObject({
      priceChaos: 3,
      totalChaos: 6,
      includedValueChaos: 0,
      exclusionReason: "stack-value"
    });
    expect(sessions[0].totalValueChaos).toBe(0);
    expect(sessions[0].profitChaos).toBe(-2);
  });

  it("excludes cards without price confidence when required", () => {
    const sessions = buildSessions(
      [makeDraw("2025-11-01T12:07:45Z", "The Lover")],
      {
        mirage: makeSnapshot("mirage", "Mirage", 10, 2)
      },
      {},
      {
        pricingLeagueId: "mirage",
        profitFilters: {
          minimumCardValueChaos: 0,
          minimumStackValueChaos: 0,
          requireConfidence: true
        }
      }
    );

    expect(sessions[0].cards[0]).toMatchObject({
      priceChaos: 10,
      totalChaos: 10,
      includedValueChaos: 0,
      exclusionReason: "confidence",
      hasPriceConfidence: false
    });
    expect(sessions[0].totalValueChaos).toBe(0);
    expect(sessions[0].profitChaos).toBe(-2);
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

function makeSnapshot(
  leagueId: string,
  leagueName: string,
  cardChaos: number,
  deckChaos: number,
  volumeCardChaos?: number
): PriceSnapshot {
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
        chaosValue: cardChaos,
        volumeChaosValue: volumeCardChaos
      }
    }
  };
}
