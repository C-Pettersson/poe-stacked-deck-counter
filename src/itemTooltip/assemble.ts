import type { GameItemData, ItemBaseDefinition, RewardSpecification, UniqueItemDefinition } from "./model.js";

export function assembleUniqueItem(unique: UniqueItemDefinition, base?: ItemBaseDefinition, version = "unknown"): GameItemData {
  return {
    rarity: "unique",
    properties: base ? buildBaseProperties(base, unique.explicitModifiers) : [],
    requirements: base ? buildRequirements(base, unique.levelRequirement) : [],
    implicitModifiers: unique.implicitModifiers,
    explicitModifiers: unique.explicitModifiers,
    description: unique.sourceText,
    flavourText: unique.flavourText,
    source: { kind: "path-of-building", version }
  };
}

export function assembleRewardSpecification(specification: RewardSpecification, version = "generated"): GameItemData {
  return {
    rarity: specification.rarity,
    properties: specification.properties,
    requirements: [],
    implicitModifiers: specification.implicitModifiers,
    explicitModifiers: [],
    itemLevel: specification.itemLevel,
    influences: specification.influences,
    corrupted: specification.corrupted,
    synthesised: specification.synthesised,
    source: { kind: "reward-specification", version }
  };
}

export function buildBaseProperties(base: ItemBaseDefinition, modifiers: string[] = []): string[] {
  const armour = base.armour;
  if (!armour) return [];
  const lines: string[] = [];
  const blockBonus = modifierRange(modifiers, /^\+\((\d+)-(\d+)\)% Chance to Block$/i);
  const armourBonus = modifierRange(modifiers, /^\+\((\d+)-(\d+)\) to Armour$/i);

  if (armour.blockChance !== undefined) {
    lines.push(blockBonus
      ? `Chance to Block: (${armour.blockChance + blockBonus[0]}-${armour.blockChance + blockBonus[1]})%`
      : `Chance to Block: ${armour.blockChance}%`);
  }
  if (armour.armourMin !== undefined && armour.armourMax !== undefined) {
    lines.push(armourBonus
      ? `Armour: (${armour.armourMin + armourBonus[0]}-${armour.armourMax + armourBonus[1]})`
      : `Armour: (${armour.armourMin}-${armour.armourMax})`);
  }
  if (armour.evasionMin !== undefined && armour.evasionMax !== undefined) {
    lines.push(`Evasion Rating: (${armour.evasionMin}-${armour.evasionMax})`);
  }
  if (armour.energyShieldMin !== undefined && armour.energyShieldMax !== undefined) {
    lines.push(`Energy Shield: (${armour.energyShieldMin}-${armour.energyShieldMax})`);
  }
  if (armour.movementPenalty) lines.push(`Movement Speed: -${armour.movementPenalty}%`);
  return lines;
}

function buildRequirements(base: ItemBaseDefinition, uniqueLevel?: number): string[] {
  const requirement = base.requirements;
  const parts: string[] = [];
  const level = uniqueLevel ?? requirement.level;
  if (level !== undefined) parts.push(`Level ${level}`);
  if (requirement.str !== undefined) parts.push(`${requirement.str} Str`);
  if (requirement.dex !== undefined) parts.push(`${requirement.dex} Dex`);
  if (requirement.int !== undefined) parts.push(`${requirement.int} Int`);
  return parts.length ? [`Requires ${parts.join(", ")}`] : [];
}

function modifierRange(modifiers: string[], pattern: RegExp): [number, number] | undefined {
  for (const modifier of modifiers) {
    const match = modifier.match(pattern);
    if (match) return [Number(match[1]), Number(match[2])];
  }
  return undefined;
}
