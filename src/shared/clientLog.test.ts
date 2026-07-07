import { describe, expect, it } from "vitest";
import { parseClientLogLines } from "./clientLog.js";
import { buildSessions } from "./sessions.js";

describe("parseClientLogLines", () => {
  it("parses single-line stacked deck draws", () => {
    const draws = parseClientLogLines([
      "2025/11/01 12:07:45 102507625 cff945bb [INFO Client 73504] : Card drawn from the deck: <divination>{The Lover}",
      "2025/11/01 12:07:46 102508609 cff945bb [INFO Client 73504] : Card drawn from the deck: <divination>{The Wolf}"
    ]);

    expect(draws).toHaveLength(2);
    expect(draws.map((draw) => draw.cardName)).toEqual(["The Lover", "The Wolf"]);
  });

  it("parses wrapped two-line stacked deck draws", () => {
    const draws = parseClientLogLines([
      "2026/07/07 11:49:09 340938796 cffb06dd [INFO Client 31172] : Card drawn from the deck:",
      "<divination>{Emperor's Luck}"
    ]);

    expect(draws).toHaveLength(1);
    expect(draws[0].cardName).toBe("Emperor's Luck");
    expect(Date.parse(draws[0].timestamp)).not.toBeNaN();
    expect(draws[0].timestamp).toContain("2026-07-07T");
  });
});

describe("buildSessions", () => {
  it("splits sessions after more than 2 hours", () => {
    const draws = parseClientLogLines([
      "2026/07/07 11:00:00 1 a [INFO Client 1] : Card drawn from the deck: <divination>{The Lover}",
      "2026/07/07 12:59:59 2 a [INFO Client 1] : Card drawn from the deck: <divination>{The Wolf}",
      "2026/07/07 15:00:00 3 a [INFO Client 1] : Card drawn from the deck: <divination>{The Nurse}"
    ]);

    expect(buildSessions(draws, null)).toHaveLength(2);
  });
});
