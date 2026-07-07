import { DEFAULT_CURRENCY_ICONS, createDefaultCurrencyPrice } from "./currencyIcons.js";
import { otherPriceSource } from "./priceSources.js";
import type {
  CardPrice,
  CurrencyPrice,
  LeagueInfo,
  PriceConfidence,
  PriceSnapshot,
  PriceSource,
  PriceSourceOptions
} from "./types.js";

const POE_NINJA_BASE = "https://poe.ninja";
const POE_WATCH_BASE = "https://api.poe.watch";
const CARD_ICON = "https://web.poecdn.com/image/Art/2DItems/Divination/InventoryIcon.png?scale=1&w=1&h=1";

interface ConfidenceFields {
  hasConfidence?: boolean;
  lowConfidence?: boolean;
  confidence?: number;
}

export interface ExchangeOverview {
  lines: Array<
    ConfidenceFields & {
      id: string;
      primaryValue: number;
      volumePrimaryValue?: number;
      sparkline?: { totalChange?: number | null };
    }
  >;
  items: Array<{
    id: string;
    name: string;
    detailsId: string;
  }>;
}

interface CurrencyLine extends ConfidenceFields {
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

export interface PoeWatchExchangeRatios {
  items: PoeWatchExchangeItem[];
}

interface PoeWatchExchangeItem {
  id: number;
  name: string;
  icon?: string;
  category?: string;
  chaos?: PoeWatchExchangeSide;
  divine?: PoeWatchExchangeSide;
}

interface PoeWatchExchangeSide {
  value: number;
  lowConfidence?: boolean;
  timestamp?: number;
  volume?: number;
  chaosValue?: number;
  divineValue?: number;
  volume24H?: number;
  history7D?: Array<{
    date: string;
    meanPrice: number;
  }>;
  change24H?: number;
}

export function cardPricesUrl(leagueName: string): string {
  const params = new URLSearchParams({ league: leagueName, type: "DivinationCard" });
  return `${POE_NINJA_BASE}/poe1/api/economy/exchange/current/overview?${params.toString()}`;
}

export function stackedDeckUrl(leagueName: string): string {
  const params = new URLSearchParams({ league: leagueName, type: "Currency" });
  return `${POE_NINJA_BASE}/poe1/api/economy/exchange/current/overview?${params.toString()}`;
}

export function poeWatchExchangeUrl(leagueName: string): string {
  const params = new URLSearchParams({ league: leagueName, game: "poe1" });
  return `${POE_WATCH_BASE}/exchange/ratios?${params.toString()}`;
}

export function sourceUrlsFor(league: LeagueInfo, source: PriceSource): PriceSnapshot["sourceUrls"] {
  if (source === "poe-watch") {
    const url = poeWatchExchangeUrl(league.poeNinjaName);
    return {
      cards: url,
      stackedDeck: url
    };
  }

  return {
    cards: cardPricesUrl(league.poeNinjaName),
    stackedDeck: stackedDeckUrl(league.poeNinjaName)
  };
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
    if (!item || !isFinitePositiveNumber(line.primaryValue)) {
      continue;
    }

    const confidence = getPoeNinjaConfidence(line);
    const price: CardPrice = {
      id: item.id,
      name: item.name,
      detailsId: item.detailsId,
      chaosValue: line.primaryValue,
      volumeChaosValue: line.volumePrimaryValue,
      hasConfidence: confidence === "high",
      confidence,
      source: "poe-ninja",
      change7d: line.sparkline?.totalChange ?? null,
      icon: CARD_ICON
    };

    cards[normalizeCardKey(item.name)] = price;
  }

  const stackedDeck = findStackedDeck(currencyData);
  const currency = {
    chaos: findCurrency(currencyData, "chaos-orb", "Chaos Orb", 1) ?? createDefaultCurrencyPrice("chaos", "poe-ninja", "high"),
    divine: findCurrency(currencyData, "divine-orb", "Divine Orb")
  };
  const expiresAt = new Date(fetchedAt.getTime() + cacheHours * 60 * 60 * 1000);

  return {
    leagueId: league.id,
    leagueName: league.name,
    poeNinjaLeague: league.poeNinjaName,
    priceSourceMode: "poe-ninja",
    priceSourcePriority: "poe-ninja",
    fetchedAt: fetchedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    cards,
    stackedDeck,
    currency,
    sourceUrls: sourceUrlsFor(league, "poe-ninja"),
    fromCache: false
  };
}

export function createPoeWatchPriceSnapshot(
  league: LeagueInfo,
  data: PoeWatchExchangeRatios,
  fetchedAt = new Date(),
  cacheHours = 12
): PriceSnapshot {
  const cards: Record<string, CardPrice> = {};

  for (const item of data.items) {
    if (item.category !== "card") {
      continue;
    }

    const chaosValue = getPoeWatchChaosValue(item.chaos);
    if (chaosValue === null) {
      continue;
    }

    const confidence = getPoeWatchConfidence(item.chaos);
    cards[normalizeCardKey(item.name)] = {
      id: String(item.id),
      name: item.name,
      detailsId: detailsIdFromName(item.name),
      chaosValue,
      volumeChaosValue: getPoeWatchVolume(item.chaos),
      hasConfidence: confidence === "high",
      confidence,
      source: "poe-watch",
      change7d: getPoeWatchChange7d(item.chaos),
      icon: item.icon || CARD_ICON
    };
  }

  const stackedDeck = findPoeWatchCurrency(data, "Stacked Deck", "stacked-deck");
  const currency = {
    chaos: findPoeWatchCurrency(data, "Chaos Orb", "chaos-orb", 1) ?? createDefaultCurrencyPrice("chaos", "poe-watch", "high"),
    divine: findPoeWatchCurrency(data, "Divine Orb", "divine-orb")
  };
  const expiresAt = new Date(fetchedAt.getTime() + cacheHours * 60 * 60 * 1000);

  return {
    leagueId: league.id,
    leagueName: league.name,
    poeNinjaLeague: league.poeNinjaName,
    priceSourceMode: "poe-watch",
    priceSourcePriority: "poe-watch",
    fetchedAt: fetchedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    cards,
    stackedDeck,
    currency,
    sourceUrls: sourceUrlsFor(league, "poe-watch"),
    fromCache: false
  };
}

export function createHybridPriceSnapshot(
  league: LeagueInfo,
  snapshots: Partial<Record<PriceSource, PriceSnapshot>>,
  options: PriceSourceOptions,
  fetchedAt = new Date(),
  cacheHours = 12
): PriceSnapshot {
  const orderedSources = options.mode === "hybrid" ? [options.priority, otherPriceSource(options.priority)] : [options.mode];
  const availableSources = orderedSources.filter((source) => snapshots[source]) as PriceSource[];
  const primarySource = availableSources[0];

  if (!primarySource) {
    throw new Error("No price source snapshots are available.");
  }

  const cards: Record<string, CardPrice> = {};
  for (const source of [...availableSources].reverse()) {
    Object.assign(cards, snapshots[source]?.cards);
  }

  const stackedDeck = pickFirstCurrencyPrice(snapshots, availableSources, (snapshot) => snapshot.stackedDeck);
  const currency = {
    chaos:
      pickFirstCurrencyPrice(snapshots, availableSources, (snapshot) => snapshot.currency?.chaos) ??
      createDefaultCurrencyPrice("chaos", primarySource, "high"),
    divine: pickFirstCurrencyPrice(snapshots, availableSources, (snapshot) => snapshot.currency?.divine)
  };
  const sourceUrls: PriceSnapshot["sourceUrls"] = sourceUrlsFor(league, primarySource);
  const fallbackSource = availableSources[1];

  if (fallbackSource) {
    const fallbackUrls = sourceUrlsFor(league, fallbackSource);
    sourceUrls.fallbackCards = fallbackUrls.cards;
    sourceUrls.fallbackStackedDeck = fallbackUrls.stackedDeck;
  }

  const expiresAt = new Date(fetchedAt.getTime() + cacheHours * 60 * 60 * 1000);

  return {
    leagueId: league.id,
    leagueName: league.name,
    poeNinjaLeague: league.poeNinjaName,
    priceSourceMode: options.mode,
    priceSourcePriority: options.priority,
    fetchedAt: fetchedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    cards,
    stackedDeck,
    currency,
    sourceUrls,
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

function getPoeNinjaConfidence(line: ConfidenceFields | undefined): PriceConfidence {
  if (!line) {
    return "unknown";
  }

  if (typeof line.hasConfidence === "boolean") {
    return line.hasConfidence ? "high" : "low";
  }

  if (typeof line.lowConfidence === "boolean") {
    return line.lowConfidence ? "low" : "high";
  }

  if (typeof line.confidence === "number") {
    return Number.isFinite(line.confidence) ? (line.confidence > 0 ? "high" : "low") : "unknown";
  }

  return "unknown";
}

function getPoeWatchConfidence(side: PoeWatchExchangeSide | undefined): PriceConfidence {
  if (!side || typeof side.lowConfidence !== "boolean") {
    return "unknown";
  }

  return side.lowConfidence ? "low" : "high";
}

function findStackedDeck(currencyData: CurrencyOverview): CurrencyPrice | null {
  const item = findCurrencyItem(currencyData, "stacked-deck", "Stacked Deck");
  const line = findCurrencyLine(currencyData, "stacked-deck", "Stacked Deck", item);
  const details = currencyData.currencyDetails?.find((entry) => entry.name === "Stacked Deck");
  const chaosValue = getLineChaosValue(line);
  const confidence = getPoeNinjaConfidence(line);

  if (chaosValue === null) {
    return null;
  }

  return {
    id: item?.id ?? "stacked-deck",
    name: item?.name ?? details?.name ?? "Stacked Deck",
    detailsId: item?.detailsId ?? line?.detailsId ?? "stacked-deck",
    chaosValue,
    confidence,
    source: "poe-ninja",
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
  const confidence = defaultChaosValue !== undefined ? "high" : getPoeNinjaConfidence(line);

  if (chaosValue === null || !Number.isFinite(chaosValue) || chaosValue <= 0) {
    return null;
  }

  return {
    id: item?.id ?? detailsId,
    name: item?.name ?? details?.name ?? name,
    detailsId: item?.detailsId ?? line?.detailsId ?? details?.tradeId ?? detailsId,
    chaosValue,
    confidence,
    source: "poe-ninja",
    icon:
      getPoeNinjaImageUrl(item?.image) ??
      details?.icon ??
      DEFAULT_CURRENCY_ICONS[detailsId === "chaos-orb" ? "chaos" : "divine"].icon
  };
}

function findPoeWatchCurrency(
  data: PoeWatchExchangeRatios,
  name: "Chaos Orb" | "Divine Orb" | "Stacked Deck",
  detailsId: "chaos-orb" | "divine-orb" | "stacked-deck",
  defaultChaosValue?: number
): CurrencyPrice | null {
  const item = data.items.find((entry) => entry.name === name);
  const chaosValue = defaultChaosValue ?? getPoeWatchChaosValue(item?.chaos);

  if (chaosValue === null || !Number.isFinite(chaosValue) || chaosValue <= 0) {
    return null;
  }

  return {
    id: item ? String(item.id) : detailsId,
    name,
    detailsId,
    chaosValue,
    confidence: defaultChaosValue !== undefined ? "high" : getPoeWatchConfidence(item?.chaos),
    source: "poe-watch",
    icon: item?.icon ?? (detailsId === "stacked-deck" ? undefined : DEFAULT_CURRENCY_ICONS[detailsId === "divine-orb" ? "divine" : "chaos"].icon)
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
  return isFinitePositiveNumber(value) ? value : null;
}

function getPoeWatchChaosValue(side: PoeWatchExchangeSide | undefined): number | null {
  const value = side?.chaosValue ?? side?.value;
  return isFinitePositiveNumber(value) ? value : null;
}

function getPoeWatchVolume(side: PoeWatchExchangeSide | undefined): number | undefined {
  const value = side?.volume24H ?? side?.volume;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function getPoeWatchChange7d(side: PoeWatchExchangeSide | undefined): number | null {
  const history = side?.history7D?.filter((entry) => isFinitePositiveNumber(entry.meanPrice));
  const first = history?.[0]?.meanPrice;
  const last = history?.at(-1)?.meanPrice;

  if (!first || !last) {
    return null;
  }

  return ((last - first) / first) * 100;
}

function pickFirstCurrencyPrice(
  snapshots: Partial<Record<PriceSource, PriceSnapshot>>,
  sources: PriceSource[],
  select: (snapshot: PriceSnapshot) => CurrencyPrice | null | undefined
): CurrencyPrice | null {
  for (const source of sources) {
    const snapshot = snapshots[source];
    const price = snapshot ? select(snapshot) : null;
    if (price) {
      return price;
    }
  }

  return null;
}

function getPoeNinjaImageUrl(image: string | undefined): string | undefined {
  if (!image) {
    return undefined;
  }

  return new URL(image, POE_NINJA_BASE).toString();
}

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
