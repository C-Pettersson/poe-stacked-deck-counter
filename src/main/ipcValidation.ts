import { z } from "zod";
import type { CollectionRun } from "../domain/collection.js";
import type { MarketPriceRequest } from "../domain/marketPricing.js";
import type { Settings } from "../shared/types.js";

const itemGameDataSchema = z.object({
  rarity: z.string().max(100).optional(),
  properties: z.array(z.string().max(1000)).max(100),
  requirements: z.array(z.string().max(1000)).max(100),
  implicitModifiers: z.array(z.string().max(1000)).max(100),
  explicitModifiers: z.array(z.string().max(1000)).max(100),
  description: z.string().max(5000).optional(),
  flavourText: z.string().max(5000).optional(),
  helpText: z.string().max(5000).optional(),
  itemLevel: z.number().int().nonnegative().max(1000).optional(),
  influences: z.array(z.enum([
    "shaper", "elder", "crusader", "hunter", "redeemer", "warlord", "searing-exarch", "eater-of-worlds"
  ])).max(2).optional(),
  corrupted: z.boolean().optional(),
  synthesised: z.boolean().optional(),
  fractured: z.boolean().optional(),
  mirrored: z.boolean().optional(),
  source: z.object({
    kind: z.enum(["path-of-building", "repoe", "reward-specification"]),
    version: z.string().max(200)
  }).optional()
});

export const catalogItemSchema = z.object({
  detailsId: z.string().trim().min(1).max(300),
  name: z.string().trim().min(1).max(300),
  baseType: z.string().max(300).optional(),
  category: z.string().max(200).nullable().optional(),
  itemType: z.string().max(200).optional(),
  icon: z.string().max(2000).optional(),
  gameData: itemGameDataSchema.optional()
});

const templateItemSchema = z.object({
  id: z.number().int().positive().optional(),
  item: catalogItemSchema,
  amount: z.number().finite().nonnegative(),
  comment: z.string().max(1000).optional(),
  group: z.number().int().optional(),
  weight: z.number().finite().optional(),
  exclusiveGroup: z.number().int().optional()
});

const templateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1).max(300),
  title: z.string().trim().min(1).max(300),
  description: z.string().max(5000),
  revision: z.string().min(1).max(200),
  categoryId: z.number().int().positive().nullable(),
  categoryName: z.string().max(300).optional(),
  image: z.string().max(2000).optional(),
  wikiUrl: z.string().url().max(2000).optional(),
  poedbUrl: z.string().url().max(2000).optional(),
  fixedResult: z.boolean(),
  allowRequirementSubmission: z.boolean(),
  requirements: z.array(templateItemSchema).max(2000),
  rewards: z.array(templateItemSchema).max(5000)
});

const runItemSchema = z.object({
  id: z.string().min(1).max(200),
  role: z.enum(["requirement", "reward"]),
  detailsId: z.string().trim().min(1).max(300),
  name: z.string().trim().min(1).max(300),
  amount: z.number().finite().nonnegative(),
  provenance: z.enum(["template", "manual", "detector", "imported"]),
  templateItemId: z.number().int().positive().optional(),
  comment: z.string().max(1000).optional(),
  icon: z.string().max(2000).optional(),
  baseType: z.string().max(300).optional(),
  category: z.string().max(200).nullable().optional(),
  itemType: z.string().max(200).optional(),
  gameData: itemGameDataSchema.optional(),
  priceOverrideChaos: z.number().finite().nonnegative().optional()
});

export const collectionRunSchema: z.ZodType<CollectionRun> = z.object({
  id: z.string().min(1).max(200),
  title: z.string().trim().min(1).max(300),
  template: templateSchema.nullable(),
  leagueId: z.string().max(200),
  gameVersion: z.string().max(100),
  runCount: z.number().int().positive(),
  durationSeconds: z.number().int().nonnegative().optional(),
  notes: z.string().max(5000),
  lifecycle: z.enum(["draft", "active", "completed", "archived"]),
  origin: z.enum(["manual", "detector", "imported"]),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  exportedAt: z.string().datetime().optional(),
  items: z.array(runItemSchema).max(10_000),
  observationIds: z.array(z.string().min(1).max(300)).max(100_000)
});

export function validateLogPath(value: unknown): string {
  return z.string().trim().min(1).max(32_768).parse(value);
}

export function validateItemSearch(value: unknown): string {
  return z.string().trim().min(2).max(200).parse(value);
}

const marketPriceRequestSchema: z.ZodType<MarketPriceRequest> = z.object({
  leagueName: z.string().trim().min(1).max(200),
  items: z.array(catalogItemSchema).min(1).max(500),
  options: z.object({
    mode: z.enum(["hybrid", "poe-watch", "poe-ninja"]),
    priority: z.enum(["poe-watch", "poe-ninja"])
  }),
  forceRefresh: z.boolean().optional()
});

export function validateMarketPriceRequest(value: unknown): MarketPriceRequest {
  return marketPriceRequestSchema.parse(value);
}

const finiteNonnegative = z.number().finite().nonnegative();
const encounterNotificationPolicySchema = z.object({
  enabled: z.boolean(),
  sound: z.boolean()
});
const settingsSchema: z.ZodType<Settings> = z.object({
  logPath: z.string().trim().min(1).max(32_768),
  selectedLeagueId: z.string().trim().min(1).max(100),
  currencyMode: z.enum(["auto", "chaos"]),
  autoScanEnabled: z.boolean(),
  fixedStackedDeckPriceChaos: finiteNonnegative.nullable(),
  priceSourceMode: z.enum(["hybrid", "poe-watch", "poe-ninja"]),
  priceSourcePriority: z.enum(["poe-watch", "poe-ninja"]),
  profitFilters: z.object({
    minimumCardValueChaos: finiteNonnegative,
    minimumStackValueChaos: finiteNonnegative,
    confidenceFilter: z.enum(["any", "exclude-low", "high-only", "low-only", "unknown-only"])
  }),
  ignoredCardNames: z.array(z.string().max(300)).max(10_000),
  sessionLeagueOverrides: z.record(z.string().max(300), z.string().max(100)),
  sessionDeckPriceOverrides: z.record(z.string().max(300), finiteNonnegative),
  encounterNotifications: z.object({
    enabled: z.boolean(),
    triggers: z.object({
      entered: z.boolean(),
      completion: z.boolean(),
      exited: z.boolean()
    }),
    encounters: z.record(z.string().max(100), encounterNotificationPolicySchema)
      .refine((value) => Object.keys(value).length <= 100, "Too many encounter notification policies")
  })
});

export function validateSettings(value: unknown): Settings {
  return settingsSchema.parse(value);
}

export function validateExportText(value: unknown): string {
  return z.string().max(5 * 1024 * 1024).parse(value);
}

export function validateExportFileName(value: unknown): string {
  return z.string().trim().min(1).max(200).regex(/^[^\\/:*?"<>|]+$/).parse(value);
}
