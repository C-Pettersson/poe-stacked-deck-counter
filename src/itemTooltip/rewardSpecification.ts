import { parseInfluences } from "./influence.js";
import type { ItemRarity, RewardSegment, RewardSpecification } from "./model.js";

const RARITY_BY_TONE: Record<string, ItemRarity> = {
  normal: "normal",
  whiteItem: "normal",
  magicItem: "magic",
  rareItem: "rare",
  uniqueItem: "unique",
  currencyItem: "currency",
  gemItem: "gem",
  divination: "divination"
};

export function parseRewardSpecification(lines: RewardSegment[][]): RewardSpecification | null {
  const first = lines[0]?.[0];
  if (!first) return null;

  const rarity = RARITY_BY_TONE[first.tone] ?? "normal";
  const properties: string[] = [];
  const implicitModifiers: string[] = [];
  const influences = lines.flatMap((line) => parseInfluences(line.map((segment) => segment.text).join(" ")));
  let itemLevel: number | undefined;
  let readsImplicit = false;

  for (const line of lines.slice(1)) {
    const text = line.map((segment) => segment.text).join(" ").replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (/^implicit modifiers?:$/i.test(text)) {
      readsImplicit = true;
      continue;
    }
    const levelMatch = text.match(/^item level:\s*(\d+)$/i);
    if (levelMatch) {
      itemLevel = Number(levelMatch[1]);
      properties.push(`Item Level: ${levelMatch[1]}`);
      continue;
    }
    if (readsImplicit && !/^corrupted$/i.test(text)) {
      implicitModifiers.push(text);
      readsImplicit = false;
      continue;
    }
    if (parseInfluences(text).length === 0) {
      properties.push(text);
    }
  }

  return {
    name: first.text,
    rarity,
    properties,
    implicitModifiers,
    influences: [...new Set(influences)],
    corrupted: lines.some((line) => line.some((segment) => segment.tone === "corrupted" && /^corrupted$/i.test(segment.text))),
    synthesised: lines.some((line) => line.some((segment) => /^synthesised$/i.test(segment.text))),
    itemLevel
  };
}
