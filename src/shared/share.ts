import { formatChaos, formatDateRange, formatSignedChaos } from "./format.js";
import { detailsIdFromName } from "./pricing.js";
import type { DeckSession, SessionCard, SharePayload } from "./types.js";

export function createDiscordShare(session: DeckSession): SharePayload {
  const topCards = session.cards.slice(0, 8).map(formatShareCard).join("\n");
  const totalValueChaos = getRawTotalValueChaos(session);
  const text = [
    `**${session.totalCards} Stacked Decks - ${session.leagueName}**`,
    formatDateRange(session.startAt, session.endAt),
    `Value: **${formatChaos(totalValueChaos)}** | Cost: **${formatChaos(session.stackedDeckCostChaos)}** | Profit: **${formatSignedChaos(totalValueChaos - session.stackedDeckCostChaos)}**`,
    "",
    topCards
  ]
    .filter(Boolean)
    .join("\n");

  return { title: "Discord summary", text };
}

export function createRedditShare(session: DeckSession): SharePayload {
  const totalValueChaos = getRawTotalValueChaos(session);
  const rows = session.cards
    .slice()
    .sort((a, b) => b.count - a.count || (b.totalChaos ?? 0) - (a.totalChaos ?? 0))
    .map((card) => `| ${escapePipes(card.name)} | ${card.count} | ${formatChaos(card.priceChaos)} | ${formatChaos(card.totalChaos)} |`)
    .join("\n");

  const text = [
    `# ${session.totalCards} Stacked Decks - ${session.leagueName}`,
    "",
    `Session: ${formatDateRange(session.startAt, session.endAt)}`,
    "",
    `Total value: ${formatChaos(totalValueChaos)}`,
    `Deck cost: ${formatChaos(session.stackedDeckCostChaos)}`,
    `Profit: ${formatSignedChaos(totalValueChaos - session.stackedDeckCostChaos)}`,
    "",
    "| Card | Count | Price | Total |",
    "|---|---:|---:|---:|",
    rows
  ].join("\n");

  return { title: "Reddit markdown", text };
}

export function createCsv(session: DeckSession): string {
  const header = "card,count,price_chaos,total_chaos";
  const rows = session.cards.map((card) =>
    [card.name, card.count, card.priceChaos ?? "", card.totalChaos ?? ""].map(csvCell).join(",")
  );

  return [header, ...rows].join("\n");
}

export function createPoeHowDraft(session: DeckSession, idFactory = createId): unknown {
  const rewards = session.cards.map((card) => ({
    rowId: idFactory(),
    itemDetailsId: card.detailsId ?? detailsIdFromName(card.name),
    itemName: card.name,
    amount: card.count,
    weight: 1,
    exclusiveGroup: 1,
    icon: card.icon ?? "",
    group: "Group 1",
    isTemplate: true
  }));

  return {
    version: 2,
    title: `${session.totalCards} Stacked Decks - ${session.leagueName}`,
    status: "active",
    updatedAt: Date.now(),
    payload: {
      activeStep: 4,
      contribution: {
        comment: `Imported from PoE Stacked Deck Counter. Session ${formatDateRange(session.startAt, session.endAt)}.`,
        runs: session.totalCards,
        gameVersion: "",
        leagueId: session.poeNinjaLeague,
        rewards,
        requirements: [],
        selectedCategoryId: 13,
        selectedCategoryName: "Stacked Deck",
        selectedTemplateId: 773,
        selectedTemplateName: "stacked-deck",
        selectedTemplateTitle: "Stacked Deck Odds Overview",
        submitAsPlayer: null
      }
    },
    metadata: {
      templateName: "stacked-deck",
      templateTitle: "Stacked Deck Odds Overview",
      categoryName: "Stacked Deck",
      leagueId: session.poeNinjaLeague,
      lastStep: 4,
      rewardCount: rewards.length,
      requirementCount: 0
    }
  };
}

export function stringifyDraft(draft: unknown): string {
  return `${JSON.stringify(draft, null, 2)}\n`;
}

function formatShareCard(card: SessionCard): string {
  return `- ${card.count}x ${card.name} (${formatChaos(card.totalChaos)})`;
}

function getRawTotalValueChaos(session: DeckSession): number {
  return session.cards.reduce((total, card) => total + (card.totalChaos ?? 0), 0);
}

function escapePipes(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `row-${Math.random().toString(36).slice(2)}`;
}
