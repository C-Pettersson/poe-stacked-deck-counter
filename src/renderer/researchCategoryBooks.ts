import type { CatalogCategory, TemplateSnapshot } from "../domain/collection.js";

export type ResearchCategoryId = number | "uncategorized";

export interface ResearchCategoryBook extends Omit<CatalogCategory, "id"> {
  id: ResearchCategoryId;
  templateCount: number;
}

export function buildResearchCategoryBooks(
  categories: CatalogCategory[],
  templates: TemplateSnapshot[]
): ResearchCategoryBook[] {
  const books: ResearchCategoryBook[] = categories
    .map((category) => ({
      ...category,
      templateCount: templates.filter((template) => template.categoryId === category.id).length
    }))
    .filter((category) => category.templateCount > 0);
  const uncategorizedCount = templates.filter((template) => template.categoryId === null).length;

  if (uncategorizedCount > 0) {
    books.push({
      id: "uncategorized",
      name: "uncategorized",
      label: "Uncategorized",
      description: "Strategy templates that have not been filed under a category yet.",
      templateCount: uncategorizedCount
    });
  }

  return books;
}

export function filterTemplatesByResearchCategory(
  templates: TemplateSnapshot[],
  categoryId: ResearchCategoryId | null,
  normalizedQuery = ""
): TemplateSnapshot[] {
  if (categoryId === null) return [];

  return templates.filter((template) => {
    const belongsToCategory = categoryId === "uncategorized"
      ? template.categoryId === null
      : template.categoryId === categoryId;
    const matchesQuery = !normalizedQuery ||
      template.title.toLowerCase().includes(normalizedQuery) ||
      template.name.toLowerCase().includes(normalizedQuery);

    return belongsToCategory && matchesQuery;
  });
}
