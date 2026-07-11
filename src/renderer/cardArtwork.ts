import { detailsIdFromName } from "../shared/pricing.js";

const CARD_ARTWORK_FILES = import.meta.glob<string>("./assets/divination-cards/*.avif", {
  eager: true,
  import: "default",
  query: "?url"
});

const CARD_ARTWORK_BY_DETAILS_ID = new Map(
  Object.entries(CARD_ARTWORK_FILES).map(([filePath, assetUrl]) => [filePath.match(/\/([^/]+)\.avif$/)?.[1], assetUrl])
);

export function getCardArtworkUrl(cardName: string): string | undefined {
  return CARD_ARTWORK_BY_DETAILS_ID.get(detailsIdFromName(cardName));
}
