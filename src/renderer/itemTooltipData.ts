import itemData from "../itemTooltip/generated/poe-item-data.json";
import { ItemDataResolver, type GameItemData, type ItemDataSet } from "../itemTooltip/index.js";

const resolver = new ItemDataResolver(itemData as ItemDataSet);

/** Canonical local unique data wins over stale metadata persisted by older app versions. */
export function resolveItemTooltipData(name: string, baseType?: string, fallback?: GameItemData): GameItemData | undefined {
  return resolver.resolveUnique(name, baseType) ?? fallback;
}
