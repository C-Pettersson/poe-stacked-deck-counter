import type { CardPrice, CurrencyPrice, LeagueInfo, PriceSnapshot } from "./types.js";
import { DEFAULT_CURRENCY_ICONS, createDefaultCurrencyPrice } from "./currencyIcons.js";

const POE_NINJA_BASE = "https://poe.ninja";
const CARD_ICON = "https://web.poecdn.com/image/Art/2DItems/Divination/InventoryIcon.png?scale=1&w=1&h=1";

export interface ExchangeOverview {
  lines: Array<{
    id: string;
    primaryValue: number;
    volumePrimaryValue?: number;
    hasConfidence?: boolean;
    lowConfidence?: boolean;
    confidence?: number;
    sparkline?: { totalChange?: number | null };
  }>;
  items: Array<{
    id: string;
    name: string;
    detailsId: string;
  }>;
}

interface CurrencyLine {
  id?: string;
  currencyTypeName?: string;
  detailsId?: string;
  primaryValue?: number;
  volumePrimaryValue?: number;
  chaosEquivalent?: number;
  receive?: {
    value?: number;
  };
}

interface CurrencyItem {
  id: string;
  name: string;
  image?: string;
  detailsId: string;
}

export interface CurrencyOverview {
  lines: CurrencyLine[];
  items?: CurrencyItem[];
  currencyDetails?: Array<{
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
  return `${POE_NINJA_BASE}/poe1/api/economy/exchange/current/overview?${params.toString()}`;
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
      hasConfidence: getLineConfidence(line),
      change7d: line.sparkline?.totalChange ?? null,
      icon: CARD_ICON
    };

    cards[normalizeCardKey(item.name)] = price;
  }

  const stackedDeck = findStackedDeck(currencyData);
  const currency = {
    chaos: findCurrency(currencyData, "chaos-orb", "Chaos Orb", 1) ?? createDefaultCurrencyPrice("chaos"),
    divine: findCurrency(currencyData, "divine-orb", "Divine Orb")
  };
  const expiresAt = new Date(fetchedAt.getTime() + cacheHours * 60 * 60 * 1000);

  return {
    leagueId: league.id,
    leagueName: league.name,
    poeNinjaLeague: league.poeNinjaName,
    fetchedAt: fetchedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    cards,
    stackedDeck,
    currency,
    sourceUrls: {
      cards: cardPricesUrl(league.poeNinjaName),
      stackedDeck: stackedDeckUrl(league.poeNinjaName)
    },
    fromCache: false
  };
}

function getLineConfidence(line: ExchangeOverview["lines"][number]): boolean {
  if (typeof line.hasConfidence === "boolean") {
    return line.hasConfidence;
  }

  if (typeof line.lowConfidence === "boolean") {
    return !line.lowConfidence;
  }

  if (typeof line.confidence === "number") {
    return Number.isFinite(line.confidence) && line.confidence > 0;
  }

  return typeof line.volumePrimaryValue === "number" && Number.isFinite(line.volumePrimaryValue) && line.volumePrimaryValue > 0;
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
  const item = findCurrencyItem(currencyData, "stacked-deck", "Stacked Deck");
  const line = findCurrencyLine(currencyData, "stacked-deck", "Stacked Deck", item);
  const details = currencyData.currencyDetails?.find((entry) => entry.name === "Stacked Deck");
  const chaosValue = getLineChaosValue(line);

  if (chaosValue === null) {
    return null;
  }

  return {
    id: item?.id ?? "stacked-deck",
    name: item?.name ?? details?.name ?? "Stacked Deck",
    detailsId: item?.detailsId ?? line?.detailsId ?? "stacked-deck",
    chaosValue,
    icon: getPoeNinjaImageUrl(item?.image) ?? details?.icon
  };
}

function findCurrency(
  currencyData: CurrencyOverview,
  detailsId: "chaos-orb" | "divine-orb",
  name: "Chaos Orb" | "Divine Orb",
  defaultChaosValue?: number
): CurrencyPrice | null {
  const item = findCurrencyItem(currencyData, detailsId, name);
  const line = findCurrencyLine(currencyData, detailsId, name, item);
  const details = currencyData.currencyDetails?.find((entry) => entry.tradeId === detailsId || entry.name === name);
  const chaosValue = defaultChaosValue ?? getLineChaosValue(line);

  if (chaosValue === null || !Number.isFinite(chaosValue) || chaosValue <= 0) {
    return null;
  }

  return {
    id: item?.id ?? detailsId,
    name: item?.name ?? details?.name ?? name,
    detailsId: item?.detailsId ?? line?.detailsId ?? details?.tradeId ?? detailsId,
    chaosValue,
    icon:
      getPoeNinjaImageUrl(item?.image) ??
      details?.icon ??
      DEFAULT_CURRENCY_ICONS[detailsId === "chaos-orb" ? "chaos" : "divine"].icon
  };
}

function findCurrencyItem(
  currencyData: CurrencyOverview,
  detailsId: "chaos-orb" | "divine-orb" | "stacked-deck",
  name: "Chaos Orb" | "Divine Orb" | "Stacked Deck"
): CurrencyItem | undefined {
  return currencyData.items?.find((entry) => entry.detailsId === detailsId || entry.name === name || entry.id === detailsId);
}

function findCurrencyLine(
  currencyData: CurrencyOverview,
  detailsId: "chaos-orb" | "divine-orb" | "stacked-deck",
  name: "Chaos Orb" | "Divine Orb" | "Stacked Deck",
  item?: CurrencyItem
): CurrencyLine | undefined {
  return currencyData.lines.find(
    (entry) =>
      (item !== undefined && entry.id === item.id) ||
      entry.id === detailsId ||
      entry.detailsId === detailsId ||
      entry.currencyTypeName === name
  );
}

function getLineChaosValue(line: CurrencyLine | undefined): number | null {
  const value = line?.primaryValue ?? line?.chaosEquivalent ?? line?.receive?.value;
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : null;
}

function getPoeNinjaImageUrl(image: string | undefined): string | undefined {
  if (!image) {
    return undefined;
  }

  return new URL(image, POE_NINJA_BASE).toString();
}
