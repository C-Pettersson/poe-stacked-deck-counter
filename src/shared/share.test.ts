import { describe, expect, it } from "vitest";
import { createDiscordShare, createPoeHowDraft, createRedditShare } from "./share.js";
import type { DeckSession } from "./types.js";

describe("createPoeHowDraft", () => {
  it("creates a poe.how compatible stacked deck draft shape", () => {
    const draft = createPoeHowDraft(makeSession(), () => "row-1") as {
      payload: { contribution: { rewards: Array<{ itemDetailsId: string; amount: number }> } };
      metadata: { rewardCount: number };
    };

    expect(draft.payload.contribution.rewards[0]).toMatchObject({
      itemDetailsId: "the-lover",
      amount: 2
    });
    expect(draft.metadata.rewardCount).toBe(1);
  });
});

describe("sharing ignored cards", () => {
  it("uses raw card totals for Discord value and profit", () => {
    const share = createDiscordShare(makeIgnoredSession());

    expect(share.text).toContain("Value: **2.00c**");
    expect(share.text).toContain("Profit: **+1.00c**");
    expect(share.text).toContain("- 2x The Lover (2.00c)");
  });

  it("uses raw card totals for Reddit value and profit", () => {
    const share = createRedditShare(makeIgnoredSession());

    expect(share.text).toContain("Total value: 2.00c");
    expect(share.text).toContain("Profit: +1.00c");
    expect(share.text).toContain("| The Lover | 2 | 1.00c | 2.00c |");
  });
});

function makeSession(): DeckSession {
  return {
    id: "session-1",
    startAt: "2026-07-07T09:00:00Z",
    endAt: "2026-07-07T09:30:00Z",
    leagueId: "mirage",
    leagueName: "Mirage",
    poeNinjaLeague: "Mirage",
    source: "auto",
    draws: [],
    cards: [
      {
        name: "The Lover",
        count: 2,
        priceChaos: 1,
        totalChaos: 2,
        detailsId: "the-lover"
      }
    ],
    totalCards: 2,
    uniqueCards: 1,
    totalValueChaos: 2,
    stackedDeckCostChaos: 1,
    profitChaos: 1,
    pricedCards: 1,
    missingPrices: 0
  };
}

function makeIgnoredSession(): DeckSession {
  return {
    ...makeSession(),
    cards: [
      {
        name: "The Lover",
        count: 2,
        priceChaos: 1,
        totalChaos: 2,
        includedValueChaos: 0,
        exclusionReason: "manual-ignore",
        isValueIgnored: true,
        detailsId: "the-lover"
      }
    ],
    totalValueChaos: 0,
    profitChaos: -1
  };
}
