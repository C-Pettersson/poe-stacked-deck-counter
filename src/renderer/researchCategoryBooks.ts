import { isTemplateReportable, type CatalogCategory, type TemplateSnapshot } from "../domain/collection.js";

export type ResearchCategoryId = number | "uncategorized";

export interface ResearchCategoryBook extends Omit<CatalogCategory, "id"> {
  id: ResearchCategoryId;
  templateCount: number;
}

export function buildResearchCategoryBooks(
  categories: CatalogCategory[],
  templates: TemplateSnapshot[]
): ResearchCategoryBook[] {
  const reportableTemplates = templates.filter(isTemplateReportable);
  const books: ResearchCategoryBook[] = categories
    .map((category) => ({
      ...category,
      templateCount: reportableTemplates.filter((template) => template.categoryId === category.id).length
    }))
    .filter((category) => category.templateCount > 0);
  const uncategorizedCount = reportableTemplates.filter((template) => template.categoryId === null).length;

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

    return isTemplateReportable(template) && belongsToCategory && matchesQuery;
  });
}
