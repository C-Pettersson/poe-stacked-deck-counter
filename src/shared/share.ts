import { formatChaos, formatDateRange, formatSignedChaos } from "./format.js";
import { getLeagueById } from "./leagues.js";
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

export function createPoeHowDraft(session: DeckSession, appVersion = "development"): unknown {
  const rewards = session.cards.map((card) => ({
    itemDetailsId: card.detailsId ?? detailsIdFromName(card.name),
    itemName: card.name,
    amount: card.count,
    provenance: "detector"
  }));

  return {
    kind: "poehow.codex-draft",
    schemaVersion: 3,
    source: {
      app: "wraeclast-field-notes",
      version: appVersion,
      collectionSource: "log_file"
    },
    exportedAt: new Date().toISOString(),
    run: {
      id: session.id,
      title: `${session.totalCards} Stacked Decks - ${session.leagueName}`,
      templateName: "stacked-deck",
      leagueId: session.leagueId,
      gameVersion: getLeagueById(session.leagueId).version,
      runs: session.totalCards,
      duration: Math.max(0, Math.round((Date.parse(session.endAt) - Date.parse(session.startAt)) / 1000)),
      comment: `Imported from Wraeclast Field Notes. Session ${formatDateRange(session.startAt, session.endAt)}.`,
      requirements: [
        {
          itemDetailsId: "stacked-deck",
          itemName: "Stacked Deck",
          amount: session.totalCards,
          provenance: "detector"
        }
      ],
      rewards,
      evidence: {
        observationCount: session.draws.length,
        detectorAssisted: true
      }
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
