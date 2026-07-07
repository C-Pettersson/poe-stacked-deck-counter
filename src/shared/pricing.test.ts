import { describe, expect, it } from "vitest";
import { createPriceSnapshot } from "./pricing.js";
import type { CurrencyOverview, ExchangeOverview } from "./pricing.js";
import type { LeagueInfo } from "./types.js";

describe("createPriceSnapshot", () => {
  it("extracts chaos and divine currency metadata", () => {
    const snapshot = createPriceSnapshot(makeLeague(), makeCards(), makeCurrency(), new Date("2026-07-07T12:00:00Z"));

    expect(snapshot.currency?.chaos).toMatchObject({
      name: "Chaos Orb",
      detailsId: "chaos-orb",
      chaosValue: 1,
      icon: "https://example.test/chaos.png"
    });
    expect(snapshot.currency?.divine).toMatchObject({
      name: "Divine Orb",
      detailsId: "divine-orb",
      chaosValue: 210,
      icon: "https://example.test/divine.png"
    });
  });
});

function makeLeague(): LeagueInfo {
  return {
    id: "mirage",
    name: "Mirage",
    poeNinjaName: "Mirage",
    poeNinjaSlug: "mirage",
    startsAt: "2026-01-01T00:00:00Z",
    endsAt: null,
    version: "3.99"
  };
}

function makeCards(): ExchangeOverview {
  return {
    lines: [{ id: "the-doctor", primaryValue: 1260 }],
    items: [{ id: "the-doctor", name: "The Doctor", detailsId: "the-doctor" }]
  };
}

function makeCurrency(): CurrencyOverview {
  return {
    lines: [
      {
        currencyTypeName: "Divine Orb",
        detailsId: "divine-orb",
        chaosEquivalent: 210
      },
      {
        currencyTypeName: "Stacked Deck",
        detailsId: "stacked-deck",
        chaosEquivalent: 2.4
      }
    ],
    currencyDetails: [
      {
        id: 1,
        name: "Chaos Orb",
        tradeId: "chaos-orb",
        icon: "https://example.test/chaos.png"
      },
      {
        id: 2,
        name: "Divine Orb",
        tradeId: "divine-orb",
        icon: "https://example.test/divine.png"
      },
      {
        id: 3,
        name: "Stacked Deck",
        tradeId: "stacked-deck",
        icon: "https://example.test/stacked-deck.png"
      }
    ]
  };
}
