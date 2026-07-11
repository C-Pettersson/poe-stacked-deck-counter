import type { CatalogItem } from "../domain/collection.js";

export interface CatalogItemSearchDescription {
  item: CatalogItem;
  metadata: string;
}

const DISPLAY_TAGS: Record<string, string> = {
  corrupted: "Corrupted",
  uncorrupted: "Uncorrupted",
  fractured: "Fractured",
  synthesised: "Synthesised",
  blighted: "Blighted",
  "blight-ravaged": "Blight-ravaged",
  foil: "Foil",
  relic: "Relic"
};

export function formatCatalogItemMetadata(item: CatalogItem): string {
  const tagNames = new Set(item.tags?.map((tag) => tag.name.toLowerCase()) ?? []);
  const metadata: string[] = [];

  addNumberedTag(metadata, tagNames, "level", (value) => `Level ${value}`);
  addNumberedTag(metadata, tagNames, "quality", (value) => `Quality ${value}%`);
  addNumberedTag(metadata, tagNames, "tier", (value) => `Tier ${value}`);
  addNumberedTag(metadata, tagNames, "area-level", (value) => `Area level ${value}`);

  for (const [tag, label] of Object.entries(DISPLAY_TAGS)) {
    if (tagNames.has(tag)) metadata.push(label);
  }

  if (item.baseType && !sameLabel(item.baseType, item.name)) {
    metadata.push(item.baseType);
  }

  const classification = item.itemType ?? item.category ?? undefined;
  if (classification && !metadata.some((label) => sameLabel(label, classification))) {
    metadata.push(humanizeLabel(classification));
  }

  return metadata.join(" · ");
}

export function describeCatalogItemSearchResults(items: CatalogItem[]): CatalogItemSearchDescription[] {
  const descriptions = items.map((item) => ({ item, metadata: formatCatalogItemMetadata(item) }));
  const signatureCounts = new Map<string, number>();

  for (const { item, metadata } of descriptions) {
    const signature = resultSignature(item.name, metadata);
    signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
  }

  return descriptions.map(({ item, metadata }) => ({
    item,
    metadata: signatureCounts.get(resultSignature(item.name, metadata))! > 1
      ? [metadata, `Variant ID: ${item.detailsId}`].filter(Boolean).join(" · ")
      : metadata
  }));
}

function addNumberedTag(
  metadata: string[],
  tags: Set<string>,
  prefix: string,
  format: (value: string) => string
): void {
  const match = [...tags].map((tag) => tag.match(new RegExp(`^${prefix}-(\\d+)$`))).find(Boolean);
  if (match?.[1]) metadata.push(format(match[1]));
}

function humanizeLabel(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sameLabel(left: string, right: string): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalize(left) === normalize(right);
}

function resultSignature(name: string, metadata: string): string {
  return `${name.toLowerCase()}\u0000${metadata.toLowerCase()}`;
}
