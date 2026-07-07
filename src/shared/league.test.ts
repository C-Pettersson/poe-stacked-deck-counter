import { describe, expect, it } from "vitest";
import { matchLeagueByDate } from "./leagues.js";

describe("matchLeagueByDate", () => {
  it("matches current Mirage sessions", () => {
    expect(matchLeagueByDate("2026-07-07T09:49:09Z")?.id).toBe("mirage");
  });

  it("matches Keepers sessions", () => {
    expect(matchLeagueByDate("2025-11-01T12:07:45Z")?.id).toBe("keepers");
  });

  it("does not match the gap between Keepers and Mirage", () => {
    expect(matchLeagueByDate("2026-03-03T12:00:00Z")).toBeNull();
  });

  it("treats league end timestamps as exclusive", () => {
    expect(matchLeagueByDate("2026-03-02T20:59:59Z")?.id).toBe("keepers");
    expect(matchLeagueByDate("2026-03-02T21:00:00Z")).toBeNull();
  });
});
