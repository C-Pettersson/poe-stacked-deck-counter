import { describe, expect, it } from "vitest";
import type { CatalogCategory, TemplateSnapshot } from "../domain/collection.js";
import { buildResearchCategoryBooks, filterTemplatesByResearchCategory } from "./researchCategoryBooks.js";

const categories: CatalogCategory[] = [
  { id: 1, name: "bosses", label: "Bosses", description: "Boss encounters" },
  { id: 2, name: "invitations", label: "Invitations", description: "Invitation encounters" },
  { id: 3, name: "cards", label: "Divination Cards", description: "Card research" },
  { id: 4, name: "empty", label: "Empty", description: "No strategies" },
  { id: 5, name: "sanctum", label: "Sanctum", description: "Fixed Sanctum strategies" }
];

const templates: TemplateSnapshot[] = [
  createTemplate(1, "maven", "The Maven", 1),
  createTemplate(2, "feared", "The Feared", 2),
  createTemplate(3, "stacked-decks", "Stacked Decks", 3),
  createTemplate(4, "loose-notes", "Loose Notes", null),
  createTemplate(5, "sanctum-fixed", "Sanctum", 5, true)
];

describe("research category books", () => {
  it("creates one selectable book per non-empty category", () => {
    expect(buildResearchCategoryBooks(categories, templates)).toMatchObject([
      { id: 1, label: "Bosses", templateCount: 1 },
      { id: 2, label: "Invitations", templateCount: 1 },
      { id: 3, label: "Divination Cards", templateCount: 1 },
      { id: "uncategorized", templateCount: 1 }
    ]);
  });

  it("shows no templates before a book is selected", () => {
    expect(filterTemplatesByResearchCategory(templates, null)).toEqual([]);
  });

  it("keeps templates from different categories out of the selected book", () => {
    expect(filterTemplatesByResearchCategory(templates, 2).map((template) => template.name)).toEqual(["feared"]);
    expect(filterTemplatesByResearchCategory(templates, 3, "stacked").map((template) => template.name)).toEqual(["stacked-decks"]);
  });

  it("excludes fixed-result strategies from reporting and category counts", () => {
    expect(buildResearchCategoryBooks(categories, templates).some((book) => book.id === 5)).toBe(false);
    expect(filterTemplatesByResearchCategory(templates, 5)).toEqual([]);
  });
});

function createTemplate(
  id: number,
  name: string,
  title: string,
  categoryId: number | null,
  fixedResult = false
): TemplateSnapshot {
  return {
    id,
    name,
    title,
    description: title,
    revision: "test",
    categoryId,
    fixedResult,
    allowRequirementSubmission: false,
    requirements: [],
    rewards: []
  };
}
