import { describe, expect, it } from "vitest";
import {
  createHybridPriceSnapshot,
  createPoeWatchPriceSnapshot,
  createPriceSnapshot,
  poeWatchExchangeUrl,
  stackedDeckUrl
} from "./pricing.js";
import type { CurrencyOverview, ExchangeOverview, PoeWatchExchangeRatios } from "./pricing.js";
import type { LeagueInfo } from "./types.js";

describe("createPriceSnapshot", () => {
  it("extracts chaos and divine currency metadata", () => {
    const snapshot = createPriceSnapshot(makeLeague(), makeCards(), makeCurrency(), new Date("2026-07-07T12:00:00Z"));

    expect(snapshot.currency?.chaos).toMatchObject({
      name: "Chaos Orb",
      detailsId: "chaos-orb",
      chaosValue: 1,
      confidence: "high",
      source: "poe-ninja",
      icon: "https://example.test/chaos.png"
    });
    expect(snapshot.currency?.divine).toMatchObject({
      name: "Divine Orb",
      detailsId: "divine-orb",
      chaosValue: 210,
      confidence: "unknown",
      source: "poe-ninja",
      icon: "https://example.test/divine.png"
    });
    expect(snapshot.stackedDeck).toMatchObject({
      name: "Stacked Deck",
      detailsId: "stacked-deck",
      chaosValue: 2.4,
      confidence: "unknown",
      source: "poe-ninja",
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
      confidence: "unknown",
      source: "poe-ninja",
      icon: "https://poe.ninja/gen/image/deck.png"
    });
    expect(snapshot.currency?.divine).toMatchObject({
      id: "divine",
      name: "Divine Orb",
      detailsId: "divine-orb",
      chaosValue: 183.9,
      confidence: "unknown",
      source: "poe-ninja",
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

describe("poeWatchExchangeUrl", () => {
  it("uses poe.watch exchange ratios for poe1", () => {
    expect(poeWatchExchangeUrl("Ancestors")).toBe("https://api.poe.watch/exchange/ratios?league=Ancestors&game=poe1");
  });
});

describe("createPoeWatchPriceSnapshot", () => {
  it("maps poe.watch exchange ratios into card and currency prices", () => {
    const snapshot = createPoeWatchPriceSnapshot(
      makeLeague(),
      makePoeWatchExchangeRatios(),
      new Date("2026-07-07T12:00:00Z")
    );

    expect(snapshot.cards["the doctor"]).toMatchObject({
      id: "100",
      name: "The Doctor",
      detailsId: "the-doctor",
      chaosValue: 1300,
      volumeChaosValue: 12,
      confidence: "high",
      source: "poe-watch",
      change7d: 30
    });
    expect(snapshot.stackedDeck).toMatchObject({
      name: "Stacked Deck",
      detailsId: "stacked-deck",
      chaosValue: 2.1,
      confidence: "low",
      source: "poe-watch"
    });
    expect(snapshot.currency?.divine).toMatchObject({
      name: "Divine Orb",
      chaosValue: 205,
      confidence: "high",
      source: "poe-watch"
    });
  });
});

describe("createHybridPriceSnapshot", () => {
  it("uses the priority source per item and fills missing prices from fallback", () => {
    const league = makeLeague();
    const poeNinja = createPriceSnapshot(league, makeCards(), makeCurrency(), new Date("2026-07-07T12:00:00Z"));
    const poeWatch = createPoeWatchPriceSnapshot(league, makePoeWatchExchangeRatios(), new Date("2026-07-07T12:00:00Z"));
    const hybrid = createHybridPriceSnapshot(
      league,
      {
        "poe-ninja": poeNinja,
        "poe-watch": poeWatch
      },
      {
        mode: "hybrid",
        priority: "poe-watch"
      },
      new Date("2026-07-07T12:00:00Z")
    );

    expect(hybrid.cards["the doctor"]).toMatchObject({
      chaosValue: 1300,
      source: "poe-watch"
    });
    expect(hybrid.cards["the lover"]).toMatchObject({
      chaosValue: 4,
      source: "poe-ninja"
    });
    expect(hybrid.stackedDeck).toMatchObject({
      chaosValue: 2.1,
      source: "poe-watch"
    });
    expect(hybrid.sourceUrls.fallbackCards).toBe("https://poe.ninja/poe1/api/economy/exchange/current/overview?league=Mirage&type=DivinationCard");
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
    lines: [
      { id: "the-doctor", primaryValue: 1260 },
      { id: "the-lover", primaryValue: 4, lowConfidence: false }
    ],
    items: [
      { id: "the-doctor", name: "The Doctor", detailsId: "the-doctor" },
      { id: "the-lover", name: "The Lover", detailsId: "the-lover" }
    ]
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

function makePoeWatchExchangeRatios(): PoeWatchExchangeRatios {
  return {
    items: [
      {
        id: 100,
        name: "The Doctor",
        category: "card",
        icon: "https://example.test/the-doctor.png",
        chaos: {
          value: 1300,
          chaosValue: 1300,
          lowConfidence: false,
          volume: 2,
          volume24H: 12,
          history7D: [
            { date: "2026-07-01", meanPrice: 1000 },
            { date: "2026-07-07", meanPrice: 1300 }
          ]
        },
        divine: {
          value: 6,
          lowConfidence: false
        }
      },
      {
        id: 200,
        name: "Stacked Deck",
        category: "currency",
        chaos: {
          value: 2.1,
          lowConfidence: true,
          volume: 100
        }
      },
      {
        id: 300,
        name: "Divine Orb",
        category: "currency",
        chaos: {
          value: 205,
          chaosValue: 205,
          lowConfidence: false,
          volume24H: 1000
        }
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
