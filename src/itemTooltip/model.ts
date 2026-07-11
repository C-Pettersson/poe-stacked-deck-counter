export type ItemRarity = "normal" | "magic" | "rare" | "unique" | "currency" | "gem" | "divination";

export type InfluenceId =
  | "shaper"
  | "elder"
  | "crusader"
  | "hunter"
  | "redeemer"
  | "warlord"
  | "searing-exarch"
  | "eater-of-worlds";

export interface ItemDataSource {
  kind: "path-of-building" | "repoe" | "reward-specification";
  version: string;
}

/** Source-neutral tooltip data. It intentionally has no React, Electron, or transport dependencies. */
export interface GameItemData {
  rarity?: ItemRarity | string;
  properties: string[];
  requirements: string[];
  implicitModifiers: string[];
  explicitModifiers: string[];
  description?: string;
  flavourText?: string;
  helpText?: string;
  itemLevel?: number;
  influences?: InfluenceId[];
  corrupted?: boolean;
  synthesised?: boolean;
  fractured?: boolean;
  mirrored?: boolean;
  source?: ItemDataSource;
}

export interface ItemBaseDefinition {
  name: string;
  itemType: string;
  subType?: string;
  implicit?: string;
  requirements: { level?: number; str?: number; dex?: number; int?: number };
  armour?: {
    blockChance?: number;
    armourMin?: number;
    armourMax?: number;
    evasionMin?: number;
    evasionMax?: number;
    energyShieldMin?: number;
    energyShieldMax?: number;
    movementPenalty?: number;
  };
}

export interface UniqueItemDefinition {
  name: string;
  baseType: string;
  levelRequirement?: number;
  implicitModifiers: string[];
  explicitModifiers: string[];
  sourceText?: string;
  flavourText?: string;
}

export interface ItemDataSet {
  version: string;
  bases: ItemBaseDefinition[];
  uniques: UniqueItemDefinition[];
}

export interface ItemModifierDefinition {
  id: string;
  family: string;
  generationType?: string;
  name?: string;
  requiredLevel?: number;
  group?: string;
  lines: string[];
  tags: string[];
  spawnWeights: Array<{ tag: string; weight: number }>;
}

export interface ItemModifierDataSet {
  version: string;
  modifiers: ItemModifierDefinition[];
}

export interface RewardSegment {
  text: string;
  tone: string;
}

export interface RewardSpecification {
  name: string;
  rarity: ItemRarity;
  properties: string[];
  implicitModifiers: string[];
  influences: InfluenceId[];
  corrupted: boolean;
  synthesised: boolean;
  itemLevel?: number;
}
