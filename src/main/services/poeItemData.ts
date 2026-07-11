import itemData from "../../itemTooltip/generated/poe-item-data.json" with { type: "json" };
import { ItemDataResolver, parseInfluences, type GameItemData, type ItemDataSet } from "../../itemTooltip/index.js";
import type { CatalogItem } from "../../domain/collection.js";

export interface PoeItemDetailsClient {
  enrichItems(items: CatalogItem[]): Promise<CatalogItem[]>;
}

export class LocalPoeItemDetailsClient implements PoeItemDetailsClient {
  private readonly resolver: ItemDataResolver;

  constructor(dataSet: ItemDataSet = itemData as ItemDataSet) {
    this.resolver = new ItemDataResolver(dataSet);
  }

  enrichItems(items: CatalogItem[]): Promise<CatalogItem[]> {
    return Promise.resolve(items.map((item) => {
      const resolved = this.resolver.resolveUnique(item.name, item.baseType);
      const gameData = resolved ? applyCatalogQualifiers(resolved, item) : undefined;
      return gameData ? { ...item, gameData } : item;
    }));
  }
}

function applyCatalogQualifiers(data: GameItemData, item: CatalogItem): GameItemData {
  const tags = item.tags?.map((tag) => tag.name.toLowerCase()) ?? [];
  const influences = [...new Set(tags.flatMap(parseInfluences))];
  return {
    ...data,
    ...(influences.length ? { influences } : {}),
    corrupted: tags.includes("corrupted") || data.corrupted,
    synthesised: tags.includes("synthesised") || data.synthesised,
    fractured: tags.includes("fractured") || data.fractured,
    mirrored: tags.includes("mirrored") || data.mirrored
  };
}
