import { describe, expect, it } from "vitest";
import type { DeckSession } from "../shared/types.js";
import { resolveSelectedSession, resolveSelectedSessionId } from "./sessionSelection.js";

describe("session selection", () => {
  const sessions = [makeSession("session-a"), makeSession("session-b")];

  it("keeps an existing selected session id", () => {
    expect(resolveSelectedSessionId(sessions, "session-b")).toBe("session-b");
    expect(resolveSelectedSession(sessions, "session-b")?.id).toBe("session-b");
  });

  it("selects the first session when the current id is missing", () => {
    expect(resolveSelectedSessionId(sessions, "stale-session")).toBe("session-a");
    expect(resolveSelectedSession(sessions, "stale-session")?.id).toBe("session-a");
  });

  it("clears the selection when no sessions are loaded", () => {
    expect(resolveSelectedSessionId([], "session-a")).toBeNull();
    expect(resolveSelectedSession([], "session-a")).toBeNull();
  });
});

function makeSession(id: string): DeckSession {
  return {
    id,
    startAt: "2026-01-15T18:00:00.000Z",
    endAt: "2026-01-15T18:00:01.000Z",
    leagueId: "mirage",
    leagueName: "Mirage",
    poeNinjaLeague: "Mirage",
    pricingLeagueId: "mirage",
    source: "auto",
    draws: [],
    cards: [],
    totalCards: 0,
    uniqueCards: 0,
    totalValueChaos: 0,
    stackedDeckCostChaos: 0,
    profitChaos: 0,
    pricedCards: 0,
    missingPrices: 0
  };
}
