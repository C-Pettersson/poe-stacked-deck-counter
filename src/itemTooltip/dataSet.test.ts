import { describe, expect, it } from "vitest";
import { ItemDataResolver } from "./dataSet.js";

describe("item data resolver", () => {
  it("uses base type to disambiguate unique definitions with the same name", () => {
    const resolver = new ItemDataResolver({
      version: "test",
      bases: [],
      uniques: [
        { name: "Shared Name", baseType: "Old Base", implicitModifiers: [], explicitModifiers: ["old"] },
        { name: "Shared Name", baseType: "Current Base", implicitModifiers: [], explicitModifiers: ["current"] }
      ]
    });

    expect(resolver.resolveUnique("Shared Name", "Current Base")?.explicitModifiers).toEqual(["current"]);
  });
});
