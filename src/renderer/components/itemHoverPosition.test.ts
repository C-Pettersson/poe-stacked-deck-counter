import { describe, expect, it } from "vitest";
import { positionItemHover } from "./itemHoverPosition.js";

const anchor = { top: 200, right: 180, bottom: 240, left: 120, width: 60, height: 40 };

describe("positionItemHover", () => {
  it("prefers the right side when it has room", () => {
    expect(positionItemHover(anchor, { width: 300, height: 400 }, { width: 1000, height: 800 })).toEqual({
      left: 194,
      top: 20,
      side: "right"
    });
  });

  it("moves to the left when the right edge would overflow", () => {
    const rightAnchor = { ...anchor, left: 820, right: 880 };

    expect(positionItemHover(rightAnchor, { width: 300, height: 300 }, { width: 1000, height: 800 })).toEqual({
      left: 506,
      top: 70,
      side: "left"
    });
  });

  it("clamps oversized edge positions inside the viewport margin", () => {
    const edgeAnchor = { ...anchor, top: 2, bottom: 42 };

    expect(positionItemHover(edgeAnchor, { width: 300, height: 500 }, { width: 700, height: 520 })).toEqual({
      left: 194,
      top: 12,
      side: "right"
    });
  });
});
