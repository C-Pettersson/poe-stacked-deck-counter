import type { InfluenceId } from "./model.js";

const INFLUENCE_LABELS: Record<InfluenceId, string> = {
  shaper: "Shaper",
  elder: "Elder",
  crusader: "Crusader",
  hunter: "Hunter",
  redeemer: "Redeemer",
  warlord: "Warlord",
  "searing-exarch": "Searing Exarch",
  "eater-of-worlds": "Eater of Worlds"
};

const INFLUENCE_ALIASES: Array<[RegExp, InfluenceId]> = [
  [/\bshaper\b/i, "shaper"],
  [/\belder\b/i, "elder"],
  [/\bcrusader\b/i, "crusader"],
  [/\bhunter\b/i, "hunter"],
  [/\bredeemer\b/i, "redeemer"],
  [/\bwarlord\b/i, "warlord"],
  [/\bsearing exarch\b/i, "searing-exarch"],
  [/\beater of worlds\b/i, "eater-of-worlds"]
];

export function parseInfluences(text: string): InfluenceId[] {
  return INFLUENCE_ALIASES.filter(([pattern]) => pattern.test(text)).map(([, influence]) => influence);
}

export function influenceLabel(influence: InfluenceId): string {
  return INFLUENCE_LABELS[influence];
}
