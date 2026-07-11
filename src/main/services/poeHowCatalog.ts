import { createTRPCUntypedClient, httpBatchLink, type TRPCUntypedClient } from "@trpc/client";
import superjson from "superjson";
import { z } from "zod";
import type {
  CatalogCategory,
  CatalogItem,
  CatalogLeague,
  CatalogReleaseVersion,
  CatalogSnapshot,
  TemplateItem,
  TemplateSnapshot
} from "../../domain/collection.js";
import { LocalPoeItemDetailsClient, type PoeItemDetailsClient } from "./poeItemData.js";

const POEHOW_TRPC_URL = "https://poe.how/api/trpc";
const CATALOG_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

const nullableString = z.string().nullable().optional();
const itemTagSchema = z
  .object({
    name: z.string().min(1),
    hidden: z.boolean().optional()
  })
  .passthrough();
const itemSchema = z
  .object({
    detailsId: z.string().min(1),
    name: z.string().min(1),
    baseType: nullableString,
    category: nullableString,
    itemType: nullableString,
    icon: nullableString,
    tags: z.array(itemTagSchema).optional()
  })
  .passthrough();

const templateItemSchema = z
  .object({
    id: z.number().int().optional(),
    amount: z.number(),
    comment: nullableString,
    group: z.number().optional(),
    weight: z.number().optional(),
    exclusiveGroup: z.number().nullable().optional(),
    item: itemSchema
  })
  .passthrough();

const categorySchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    header: z.string(),
    description: z.string(),
    icon: nullableString
  })
  .passthrough();

const templateSchema = z
  .object({
    id: z.number().int(),
    name: z.string().min(1),
    title: z.string().min(1),
    description: z.string(),
    image: nullableString,
    strategyCategoryId: z.number().int().nullable(),
    active: z.boolean(),
    fixedResult: z.boolean(),
    allowRequirementSubmission: z.boolean(),
    createdAt: z.union([z.string(), z.date()]).optional(),
    updatedAt: z.union([z.string(), z.date()]).optional(),
    StrategyCategory: categorySchema.nullable().optional(),
    requirements: z.array(templateItemSchema).default([]),
    rewards: z.array(templateItemSchema).default([])
  })
  .passthrough();

const leagueSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    displayName: z.string().nullable().optional()
  })
  .passthrough();

const releaseVersionSchema = z
  .object({
    id: z.string(),
    version: z.string(),
    name: z.string(),
    current: z.boolean(),
    active: z.boolean()
  })
  .passthrough();

const itemSearchResponseSchema = z.object({ items: z.array(itemSchema) }).passthrough();

interface CatalogCachePort {
  readCatalog(): Promise<CatalogSnapshot | null>;
  writeCatalog(snapshot: CatalogSnapshot): Promise<void>;
}

export interface PoeHowPublicClient {
  query(path: string, input: unknown): Promise<unknown>;
}

export class PoeHowCatalogService {
  private readonly client: PoeHowPublicClient;
  private readonly itemDetailsClient: PoeItemDetailsClient;

  constructor(
    private readonly cache: CatalogCachePort,
    appVersion: string,
    client?: PoeHowPublicClient,
    itemDetailsClient: PoeItemDetailsClient = new LocalPoeItemDetailsClient()
  ) {
    this.client = client ?? createTRPCUntypedClient<any>({
      links: [
        httpBatchLink({
          url: POEHOW_TRPC_URL,
          transformer: superjson,
          headers: {
            accept: "application/json",
            "user-agent": `wraeclast-field-notes/${appVersion}`
          },
          fetch: (input, init) => boundedFetch(input, init, appVersion)
        })
      ]
    });
    this.itemDetailsClient = itemDetailsClient;
  }

  async getCatalog(forceRefresh = false): Promise<CatalogSnapshot> {
    const cached = await this.cache.readCatalog();
    if (cached && !forceRefresh && Date.parse(cached.expiresAt) > Date.now()) {
      return { ...cached, fromCache: true };
    }

    try {
      const [rawTemplates, rawCategories, rawLeagues, rawReleaseVersions] = await Promise.all([
        this.client.query("strategies.templates.listActive", undefined),
        this.client.query("strategies.categories.list", undefined),
        this.client.query("league.list", undefined),
        this.client.query("releaseVersions.list", undefined)
      ]);
      const fetchedAt = new Date();
      const snapshot: CatalogSnapshot = {
        fetchedAt: fetchedAt.toISOString(),
        expiresAt: new Date(fetchedAt.getTime() + CATALOG_TTL_MS).toISOString(),
        templates: z.array(templateSchema).parse(rawTemplates).filter((entry) => entry.active).map(mapTemplate),
        categories: z.array(categorySchema).parse(rawCategories).map(mapCategory),
        leagues: z.array(leagueSchema).parse(rawLeagues).map(mapLeague),
        releaseVersions: z.array(releaseVersionSchema).parse(rawReleaseVersions).map(mapReleaseVersion),
        fromCache: false
      };
      await this.cache.writeCatalog(snapshot);
      return snapshot;
    } catch (error) {
      if (cached) {
        return { ...cached, fromCache: true };
      }
      throw new Error(`poe.how catalog refresh failed: ${formatError(error)}`);
    }
  }

  async searchItems(query: string): Promise<CatalogItem[]> {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      return [];
    }

    const payload = await this.client.query("items.search", {
      search: normalizedQuery,
      page: 1,
      limit: 30
    });
    const items = itemSearchResponseSchema.parse(payload).items.map(mapItem);
    try {
      return await this.itemDetailsClient.enrichItems(items);
    } catch {
      return items;
    }
  }
}

function mapTemplate(template: z.infer<typeof templateSchema>): TemplateSnapshot {
  const revisionValue = template.updatedAt ?? template.createdAt;
  const revision = revisionValue instanceof Date ? revisionValue.toISOString() : revisionValue ?? `template-${template.id}`;

  return {
    id: template.id,
    name: template.name,
    title: template.title,
    description: template.description,
    revision,
    categoryId: template.strategyCategoryId,
    categoryName: template.StrategyCategory?.header ?? template.StrategyCategory?.name,
    image: template.image ?? undefined,
    fixedResult: template.fixedResult,
    allowRequirementSubmission: template.allowRequirementSubmission,
    requirements: template.requirements.map(mapTemplateItem),
    rewards: template.rewards.map(mapTemplateItem)
  };
}

function mapTemplateItem(entry: z.infer<typeof templateItemSchema>): TemplateItem {
  return {
    id: entry.id,
    item: mapItem(entry.item),
    amount: entry.amount,
    comment: entry.comment ?? undefined,
    group: entry.group,
    weight: entry.weight,
    exclusiveGroup: entry.exclusiveGroup ?? undefined
  };
}

function mapCategory(category: z.infer<typeof categorySchema>): CatalogCategory {
  return {
    id: category.id,
    name: category.name,
    label: category.header || category.name,
    description: category.description,
    icon: category.icon ?? undefined
  };
}

function mapItem(item: z.infer<typeof itemSchema>): CatalogItem {
  return {
    detailsId: item.detailsId,
    name: item.name,
    baseType: item.baseType ?? undefined,
    category: item.category,
    itemType: item.itemType ?? undefined,
    icon: item.icon ?? undefined,
    tags: item.tags?.map((tag) => ({ name: tag.name, hidden: tag.hidden }))
  };
}

function mapLeague(league: z.infer<typeof leagueSchema>): CatalogLeague {
  return {
    id: league.id,
    name: league.name,
    displayName: league.displayName ?? league.name
  };
}

function mapReleaseVersion(version: z.infer<typeof releaseVersionSchema>): CatalogReleaseVersion {
  return {
    id: version.id,
    version: version.version,
    name: version.name,
    current: version.current,
    active: version.active
  };
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : "unknown response error";
}

async function boundedFetch(input: RequestInfo | URL, init: RequestInit | undefined, appVersion: string): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("user-agent", `wraeclast-field-notes/${appVersion}`);
  const response = await fetch(input, {
    ...init,
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("poe.how response exceeded the configured limit.");
  }
  const body = await response.arrayBuffer();
  if (body.byteLength > MAX_RESPONSE_BYTES) {
    throw new Error("poe.how response exceeded the configured limit.");
  }
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}
