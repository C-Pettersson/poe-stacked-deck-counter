import type { CardPrice, CurrencyPrice, LeagueInfo, PriceSnapshot } from "./types.js";

const POE_NINJA_BASE = "https://poe.ninja";
const CARD_ICON = "https://web.poecdn.com/image/Art/2DItems/Divination/InventoryIcon.png?scale=1&w=1&h=1";

export interface ExchangeOverview {
  lines: Array<{
    id: string;
    primaryValue: number;
    volumePrimaryValue?: number;
    sparkline?: { totalChange?: number | null };
  }>;
  items: Array<{
    id: string;
    name: string;
    detailsId: string;
  }>;
}

export interface CurrencyOverview {
  lines: Array<{
    currencyTypeName: string;
    detailsId?: string;
    chaosEquivalent?: number;
    receive?: {
      value?: number;
    };
  }>;
  currencyDetails: Array<{
    id: number;
    name: string;
    icon?: string;
    tradeId?: string;
  }>;
}

export function cardPricesUrl(leagueName: string): string {
  const params = new URLSearchParams({ league: leagueName, type: "DivinationCard" });
  return `${POE_NINJA_BASE}/poe1/api/economy/exchange/current/overview?${params.toString()}`;
}

export function stackedDeckUrl(leagueName: string): string {
  const params = new URLSearchParams({ league: leagueName, type: "Currency" });
  return `${POE_NINJA_BASE}/poe1/api/economy/stash/current/currency/overview?${params.toString()}`;
}

export function normalizeCardKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w\s'-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function detailsIdFromName(name: string): string {
  return normalizeCardKey(name).replace(/['"]/g, "").replace(/\s+/g, "-");
}

export function createPriceSnapshot(
  league: LeagueInfo,
  cardsData: ExchangeOverview,
  currencyData: CurrencyOverview,
  fetchedAt = new Date(),
  cacheHours = 12
): PriceSnapshot {
  const itemById = new Map(cardsData.items.map((item) => [item.id, item]));
  const cards: Record<string, CardPrice> = {};

  for (const line of cardsData.lines) {
    const item = itemById.get(line.id);
    if (!item) {
      continue;
    }

    const price: CardPrice = {
      id: item.id,
      name: item.name,
      detailsId: item.detailsId,
      chaosValue: line.primaryValue,
      volumeChaosValue: line.volumePrimaryValue,
      change7d: line.sparkline?.totalChange ?? null,
      icon: CARD_ICON
    };

    cards[normalizeCardKey(item.name)] = price;
  }

  const stackedDeck = findStackedDeck(currencyData);
  const expiresAt = new Date(fetchedAt.getTime() + cacheHours * 60 * 60 * 1000);

  return {
    leagueId: league.id,
    leagueName: league.name,
    poeNinjaLeague: league.poeNinjaName,
    fetchedAt: fetchedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    cards,
    stackedDeck,
    sourceUrls: {
      cards: cardPricesUrl(league.poeNinjaName),
      stackedDeck: stackedDeckUrl(league.poeNinjaName)
    },
    fromCache: false
  };
}

export function getCardPrice(snapshot: PriceSnapshot | null, cardName: string): CardPrice | null {
  if (!snapshot) {
    return null;
  }

  return snapshot.cards[normalizeCardKey(cardName)] ?? null;
}

export function isSnapshotFresh(snapshot: PriceSnapshot, now = new Date()): boolean {
  return new Date(snapshot.expiresAt).getTime() > now.getTime();
}

function findStackedDeck(currencyData: CurrencyOverview): CurrencyPrice | null {
  const line = currencyData.lines.find(
    (entry) => entry.detailsId === "stacked-deck" || entry.currencyTypeName === "Stacked Deck"
  );
  const details = currencyData.currencyDetails.find((entry) => entry.name === "Stacked Deck");

  if (!line && !details) {
    return null;
  }

  return {
    id: "stacked-deck",
    name: "Stacked Deck",
    detailsId: line?.detailsId ?? "stacked-deck",
    chaosValue: line?.chaosEquivalent ?? line?.receive?.value ?? 0,
    icon: details?.icon
  };
}
