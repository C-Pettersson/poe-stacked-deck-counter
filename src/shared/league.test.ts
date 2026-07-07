import { describe, expect, it } from "vitest";
import { matchLeagueByDate } from "./leagues.js";

describe("matchLeagueByDate", () => {
  it("matches current Mirage sessions", () => {
    expect(matchLeagueByDate("2026-07-07T09:49:09Z")?.id).toBe("mirage");
  });

  it("matches Keepers sessions", () => {
    expect(matchLeagueByDate("2025-11-01T12:07:45Z")?.id).toBe("keepers");
  });
});
