import { describe, expect, it } from "vitest";
import { getCardWikiUrl } from "./cardMetadata.js";

describe("getCardWikiUrl", () => {
  it("creates PoE Wiki URLs from card names", () => {
    expect(getCardWikiUrl("The Watcher")).toBe("https://www.poewiki.net/wiki/The_Watcher");
  });
});
