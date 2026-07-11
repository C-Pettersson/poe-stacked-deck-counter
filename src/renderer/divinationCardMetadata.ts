import cardData from "./assets/divination-card-data.json";
import { detailsIdFromName } from "../shared/pricing.js";

export interface DivinationCardRewardSegment {
  text: string;
  tone: string;
}

export interface DivinationCardMetadata {
  name: string;
  stackSize: number | null;
  rewardLines: DivinationCardRewardSegment[][];
  flavourText: string;
  dropLevel: string | null;
}

const CARD_METADATA_BY_DETAILS_ID = new Map(
  (cardData as DivinationCardMetadata[]).map((card) => [detailsIdFromName(card.name), card])
);

export function getDivinationCardMetadata(cardName: string): DivinationCardMetadata | undefined {
  return CARD_METADATA_BY_DETAILS_ID.get(detailsIdFromName(cardName));
}
