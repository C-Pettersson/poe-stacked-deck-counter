import { describe, expect, it } from "vitest";
import { formatCurrencyValue, formatSignedCurrencyValue } from "./currencyFormat.js";

describe("formatCurrencyValue", () => {
  it("returns a placeholder for missing values", () => {
    expect(formatCurrencyValue(null, { mode: "auto", divineChaosValue: 200 })).toMatchObject({
      text: "-",
      denomination: null,
      ariaLabel: "No price"
    });
  });

  it("uses chaos in auto mode at the threshold", () => {
    expect(formatCurrencyValue(1000, { mode: "auto", divineChaosValue: 200, locale: "en-US" })).toMatchObject({
      text: "1,000",
      denomination: "chaos",
      converted: false
    });
  });

  it("uses divine in auto mode above the threshold", () => {
    expect(formatCurrencyValue(1260, { mode: "auto", divineChaosValue: 200, locale: "en-US" })).toMatchObject({
      text: "6.30",
      denomination: "divine",
      title: "1,260 chaos",
      converted: true
    });
  });

  it("stays in chaos when chaos mode is selected", () => {
    expect(formatCurrencyValue(1260, { mode: "chaos", divineChaosValue: 200, locale: "en-US" })).toMatchObject({
      text: "1,260",
      denomination: "chaos",
      converted: false
    });
  });

  it("falls back to chaos when a divine rate is missing", () => {
    expect(formatCurrencyValue(1260, { mode: "auto", divineChaosValue: null, locale: "en-US" })).toMatchObject({
      text: "1,260",
      denomination: "chaos",
      converted: false
    });
  });
});

describe("formatSignedCurrencyValue", () => {
  it("prefixes positive values", () => {
    expect(formatSignedCurrencyValue(42, { mode: "auto", divineChaosValue: 200 })).toMatchObject({
      text: "+42",
      denomination: "chaos"
    });
  });
});
