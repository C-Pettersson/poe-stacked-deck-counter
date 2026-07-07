import { describe, expect, it } from "vitest";
import { createPriceSnapshot, stackedDeckUrl } from "./pricing.js";
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
    expect(snapshot.stackedDeck).toMatchObject({
      name: "Stacked Deck",
      detailsId: "stacked-deck",
      chaosValue: 2.4,
      icon: "https://example.test/stacked-deck.png"
    });
  });

  it("extracts stacked deck prices from poe.ninja currency exchange data", () => {
    const snapshot = createPriceSnapshot(
      makeLeague(),
      makeCards(),
      makeCurrencyExchangeOverview(),
      new Date("2026-07-07T12:00:00Z")
    );

    expect(snapshot.stackedDeck).toMatchObject({
      id: "stacked-deck",
      name: "Stacked Deck",
      detailsId: "stacked-deck",
      chaosValue: 1.9,
      icon: "https://poe.ninja/gen/image/deck.png"
    });
    expect(snapshot.currency?.divine).toMatchObject({
      id: "divine",
      name: "Divine Orb",
      detailsId: "divine-orb",
      chaosValue: 183.9,
      icon: "https://poe.ninja/gen/image/divine.png"
    });
  });

  it("does not create a zero-value stacked deck price from metadata alone", () => {
    const snapshot = createPriceSnapshot(
      makeLeague(),
      makeCards(),
      {
        lines: [],
        currencyDetails: [{ id: 3, name: "Stacked Deck", tradeId: "stacked-deck" }]
      },
      new Date("2026-07-07T12:00:00Z")
    );

    expect(snapshot.stackedDeck).toBeNull();
  });
});

describe("stackedDeckUrl", () => {
  it("uses poe.ninja exchange currency overview data", () => {
    expect(stackedDeckUrl("Ancestors")).toBe(
      "https://poe.ninja/poe1/api/economy/exchange/current/overview?league=Ancestors&type=Currency"
    );
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

function makeCurrencyExchangeOverview(): CurrencyOverview {
  return {
    lines: [
      {
        id: "stacked-deck",
        primaryValue: 1.9,
        volumePrimaryValue: 22833
      },
      {
        id: "chaos",
        primaryValue: 1,
        volumePrimaryValue: 287332
      },
      {
        id: "divine",
        primaryValue: 183.9,
        volumePrimaryValue: 287332
      }
    ],
    items: [
      {
        id: "stacked-deck",
        name: "Stacked Deck",
        image: "/gen/image/deck.png",
        detailsId: "stacked-deck"
      },
      {
        id: "chaos",
        name: "Chaos Orb",
        image: "/gen/image/chaos.png",
        detailsId: "chaos-orb"
      },
      {
        id: "divine",
        name: "Divine Orb",
        image: "/gen/image/divine.png",
        detailsId: "divine-orb"
      }
    ]
  };
}
