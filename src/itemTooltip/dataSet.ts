import type { GameItemData, ItemDataSet } from "./model.js";
import { assembleUniqueItem } from "./assemble.js";

export class ItemDataResolver {
  private readonly basesByName: Map<string, ItemDataSet["bases"][number]>;
  private readonly uniquesByName: Map<string, ItemDataSet["uniques"]>;

  constructor(private readonly dataSet: ItemDataSet) {
    this.basesByName = new Map(dataSet.bases.map((base) => [normalize(base.name), base]));
    this.uniquesByName = new Map();
    for (const unique of dataSet.uniques) {
      const key = normalize(unique.name);
      this.uniquesByName.set(key, [...(this.uniquesByName.get(key) ?? []), unique]);
    }
  }

  resolveUnique(name: string, baseType?: string): GameItemData | undefined {
    const candidates = this.uniquesByName.get(normalize(name));
    const unique = candidates?.find((candidate) => baseType && normalize(candidate.baseType) === normalize(baseType)) ?? candidates?.[0];
    if (!unique) return undefined;
    const base = this.basesByName.get(normalize(baseType || unique.baseType));
    return assembleUniqueItem(unique, base, this.dataSet.version);
  }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}
