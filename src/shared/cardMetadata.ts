const POE_WIKI_BASE_URL = "https://www.poewiki.net/wiki/";

export function getCardWikiUrl(cardName: string): string {
  return `${POE_WIKI_BASE_URL}${encodeURIComponent(cardName.trim().replace(/\s+/g, "_"))}`;
}
