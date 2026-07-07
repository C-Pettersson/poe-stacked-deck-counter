import { describe, expect, it } from "vitest";
import { formatDropRate } from "./format.js";

describe("formatDropRate", () => {
  it("formats a card count against the total opened cards", () => {
    expect(formatDropRate(2, 100)).toBe("2/100 (2.00%)");
  });

  it("returns a placeholder when the total is empty", () => {
    expect(formatDropRate(1, 0)).toBe("-");
  });
});
