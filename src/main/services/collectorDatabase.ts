import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { open, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import type { CatalogSnapshot, CollectionRun, Observation, RunItem } from "../../domain/collection.js";
import type { MarketPriceDataset } from "../../domain/marketPricing.js";
import type { ClientLogDraw } from "../../shared/types.js";
import {
  normalizeLogPath,
  type CachedPendingDraw,
  type LogScanAnchor,
  type LogScanCachePort,
  type LogScanSnapshot
} from "./logScanCache.js";

const DATABASE_SCHEMA_VERSION = 2;
const SCAN_CACHE_VERSION = 1;

export class CollectorDatabase {
  private readonly database: DatabaseSync;

  constructor(userDataPath: string) {
    this.database = openDatabase(path.join(userDataPath, "collector.db"));
    this.migrate();
  }

  close(): void {
    this.database.close();
  }

  listRuns(includeArchived = false): CollectionRun[] {
    const rows = this.database
      .prepare(
        `SELECT * FROM collection_runs
         ${includeArchived ? "" : "WHERE lifecycle <> 'archived'"}
         ORDER BY COALESCE(started_at, created_at) DESC`
      )
      .all() as unknown as RunRow[];

    const itemStatement = this.database.prepare("SELECT * FROM run_items WHERE run_id = ? ORDER BY row_order, id");
    const observationStatement = this.database.prepare(
      "SELECT observation_id FROM run_observations WHERE run_id = ? ORDER BY observation_id"
    );

    return rows.map((row) => mapRun(row, itemStatement, observationStatement));
  }

  saveRun(run: CollectionRun): CollectionRun {
    this.database.exec("BEGIN IMMEDIATE");

    try {
      this.database
        .prepare(
          `INSERT INTO collection_runs (
             id, title, template_name, template_revision, template_snapshot, league_id, game_version,
             run_count, duration_seconds, notes, lifecycle, origin, started_at, ended_at,
             created_at, updated_at, exported_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             template_name = excluded.template_name,
             template_revision = excluded.template_revision,
             template_snapshot = excluded.template_snapshot,
             league_id = excluded.league_id,
             game_version = excluded.game_version,
             run_count = excluded.run_count,
             duration_seconds = excluded.duration_seconds,
             notes = excluded.notes,
             lifecycle = excluded.lifecycle,
             origin = excluded.origin,
             started_at = excluded.started_at,
             ended_at = excluded.ended_at,
             updated_at = excluded.updated_at,
             exported_at = excluded.exported_at`
        )
        .run(
          run.id,
          run.title,
          run.template?.name ?? null,
          run.template?.revision ?? null,
          run.template ? JSON.stringify(run.template) : null,
          run.leagueId,
          run.gameVersion,
          run.runCount,
          run.durationSeconds ?? null,
          run.notes,
          run.lifecycle,
          run.origin,
          run.startedAt ?? null,
          run.endedAt ?? null,
          run.createdAt,
          run.updatedAt,
          run.exportedAt ?? null
        );

      this.database.prepare("DELETE FROM run_items WHERE run_id = ?").run(run.id);
      const insertItem = this.database.prepare(
        `INSERT INTO run_items (
           id, run_id, role, details_id, name, amount, provenance, template_item_id,
           comment, icon, price_override_chaos, row_order
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      run.items.forEach((item, index) => insertRunItem(insertItem, run.id, item, index));

      this.database.prepare("DELETE FROM run_observations WHERE run_id = ?").run(run.id);
      const insertObservationLink = this.database.prepare(
        "INSERT OR IGNORE INTO run_observations (run_id, observation_id) VALUES (?, ?)"
      );
      for (const observationId of run.observationIds) {
        insertObservationLink.run(run.id, observationId);
      }

      this.database.exec("COMMIT");
      return run;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  readCatalog(): CatalogSnapshot | null {
    const row = this.database.prepare("SELECT payload FROM catalog_snapshots WHERE cache_key = 'poehow'").get() as
      | { payload: string }
      | undefined;

    if (!row) {
      return null;
    }

    try {
      return { ...(JSON.parse(row.payload) as CatalogSnapshot), fromCache: true };
    } catch {
      return null;
    }
  }

  writeCatalog(snapshot: CatalogSnapshot): void {
    this.database
      .prepare(
        `INSERT INTO catalog_snapshots (cache_key, fetched_at, expires_at, payload)
         VALUES ('poehow', ?, ?, ?)
         ON CONFLICT(cache_key) DO UPDATE SET
           fetched_at = excluded.fetched_at,
           expires_at = excluded.expires_at,
           payload = excluded.payload`
      )
      .run(snapshot.fetchedAt, snapshot.expiresAt, JSON.stringify({ ...snapshot, fromCache: false }));
  }

  readPriceDataset(cacheKey: string): MarketPriceDataset | null {
    const row = this.database.prepare("SELECT * FROM price_datasets WHERE cache_key = ?").get(cacheKey) as unknown as
      | PriceDatasetRow
      | undefined;
    if (!row) return null;
    try {
      return {
        cacheKey: row.cache_key,
        source: row.source,
        leagueName: row.league_id,
        datasetKey: row.dataset_key,
        sourceUrl: row.source_url,
        fetchedAt: row.fetched_at,
        expiresAt: row.expires_at,
        payload: JSON.parse(row.payload),
        fromCache: true
      };
    } catch {
      return null;
    }
  }

  writePriceDataset(dataset: MarketPriceDataset): void {
    this.database
      .prepare(
        `INSERT INTO price_datasets (
           cache_key, source, league_id, dataset_key, source_url, fetched_at, expires_at, payload
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(cache_key) DO UPDATE SET
           source = excluded.source,
           league_id = excluded.league_id,
           dataset_key = excluded.dataset_key,
           source_url = excluded.source_url,
           fetched_at = excluded.fetched_at,
           expires_at = excluded.expires_at,
           payload = excluded.payload`
      )
      .run(
        dataset.cacheKey,
        dataset.source,
        dataset.leagueName,
        dataset.datasetKey,
        dataset.sourceUrl,
        dataset.fetchedAt,
        dataset.expiresAt,
        JSON.stringify(dataset.payload)
      );
  }

  readScanSnapshot(normalizedPath: string): LogScanSnapshot | null {
    const row = this.database.prepare("SELECT * FROM scan_checkpoints WHERE normalized_path = ?").get(normalizedPath) as
      | ScanCheckpointRow
      | undefined;

    if (!row) {
      return null;
    }

    const drawRows = this.database
      .prepare(
        `SELECT id, line_number, occurred_at, payload
         FROM observations
         WHERE source_id = ? AND detector_id = 'stacked-deck'
         ORDER BY line_number, occurred_at, id`
      )
      .all(normalizedPath) as unknown as Array<{ id: string; line_number: number; occurred_at: string; payload: string }>;
    const draws = drawRows.map(mapDrawRow);

    return {
      version: SCAN_CACHE_VERSION,
      filePath: row.file_path,
      normalizedPath: row.normalized_path,
      fileSize: Number(row.file_size),
      linesRead: Number(row.lines_read),
      scannedAt: row.scanned_at,
      draws,
      pendingDraw: parseNullableJson<CachedPendingDraw>(row.pending_draw),
      anchor: parseNullableJson<LogScanAnchor>(row.anchor)
    };
  }

  writeScanSnapshot(snapshot: LogScanSnapshot): void {
    this.database.exec("BEGIN IMMEDIATE");

    try {
      this.database
        .prepare(
          `INSERT INTO scan_checkpoints (
             normalized_path, file_path, file_size, lines_read, scanned_at, pending_draw, anchor
           ) VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(normalized_path) DO UPDATE SET
             file_path = excluded.file_path,
             file_size = excluded.file_size,
             lines_read = excluded.lines_read,
             scanned_at = excluded.scanned_at,
             pending_draw = excluded.pending_draw,
             anchor = excluded.anchor`
        )
        .run(
          snapshot.normalizedPath,
          snapshot.filePath,
          snapshot.fileSize,
          snapshot.linesRead,
          snapshot.scannedAt,
          snapshot.pendingDraw ? JSON.stringify(snapshot.pendingDraw) : null,
          snapshot.anchor ? JSON.stringify(snapshot.anchor) : null
        );

      this.database
        .prepare("DELETE FROM observations WHERE source_id = ? AND detector_id = 'stacked-deck'")
        .run(snapshot.normalizedPath);
      const insert = this.database.prepare(
        `INSERT INTO observations (
           id, source_id, detector_id, kind, occurred_at, line_number, byte_offset, confidence, payload
         ) VALUES (?, ?, 'stacked-deck', 'card-draw', ?, ?, NULL, 'high', ?)`
      );

      for (const draw of snapshot.draws) {
        insert.run(draw.id, snapshot.normalizedPath, draw.timestamp, draw.lineNumber, JSON.stringify({ cardName: draw.cardName }));
      }

      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  upsertObservations(observations: Observation[]): void {
    this.database.exec("BEGIN IMMEDIATE");
    const statement = this.database.prepare(
      `INSERT INTO observations (
         id, source_id, detector_id, kind, occurred_at, line_number, byte_offset, confidence, payload
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         occurred_at = excluded.occurred_at,
         line_number = excluded.line_number,
         byte_offset = excluded.byte_offset,
         confidence = excluded.confidence,
         payload = excluded.payload`
    );

    try {
      for (const observation of observations) {
        statement.run(
          observation.id,
          observation.sourceId,
          observation.detectorId,
          observation.kind,
          observation.occurredAt,
          observation.lineNumber ?? null,
          observation.byteOffset ?? null,
          observation.confidence,
          JSON.stringify(observation.payload)
        );
      }
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  getMeta(key: string): string | null {
    const row = this.database.prepare("SELECT value FROM app_meta WHERE key = ?").get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  setMeta(key: string, value: string): void {
    this.database
      .prepare("INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(key, value);
  }

  private migrate(): void {
    this.database.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS collection_runs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        template_name TEXT,
        template_revision TEXT,
        template_snapshot TEXT,
        league_id TEXT NOT NULL DEFAULT '',
        game_version TEXT NOT NULL DEFAULT '',
        run_count INTEGER NOT NULL DEFAULT 1 CHECK(run_count > 0),
        duration_seconds INTEGER,
        notes TEXT NOT NULL DEFAULT '',
        lifecycle TEXT NOT NULL CHECK(lifecycle IN ('draft', 'active', 'completed', 'archived')),
        origin TEXT NOT NULL CHECK(origin IN ('manual', 'detector', 'imported')),
        started_at TEXT,
        ended_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        exported_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_collection_runs_lifecycle_updated
        ON collection_runs(lifecycle, updated_at DESC);

      CREATE TABLE IF NOT EXISTS run_items (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES collection_runs(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('requirement', 'reward')),
        details_id TEXT NOT NULL,
        name TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount >= 0),
        provenance TEXT NOT NULL CHECK(provenance IN ('template', 'manual', 'detector', 'imported')),
        template_item_id INTEGER,
        comment TEXT,
        icon TEXT,
        price_override_chaos REAL,
        row_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_run_items_run_role ON run_items(run_id, role, row_order);

      CREATE TABLE IF NOT EXISTS observations (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        detector_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        line_number INTEGER,
        byte_offset INTEGER,
        confidence TEXT NOT NULL,
        payload TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_observations_source_detector
        ON observations(source_id, detector_id, line_number, occurred_at);

      CREATE TABLE IF NOT EXISTS run_observations (
        run_id TEXT NOT NULL REFERENCES collection_runs(id) ON DELETE CASCADE,
        observation_id TEXT NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
        PRIMARY KEY(run_id, observation_id)
      );

      CREATE TABLE IF NOT EXISTS scan_checkpoints (
        normalized_path TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        lines_read INTEGER NOT NULL,
        scanned_at TEXT NOT NULL,
        pending_draw TEXT,
        anchor TEXT
      );

      CREATE TABLE IF NOT EXISTS catalog_snapshots (
        cache_key TEXT PRIMARY KEY,
        fetched_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        payload TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS price_datasets (
        cache_key TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        league_id TEXT NOT NULL,
        dataset_key TEXT NOT NULL,
        source_url TEXT NOT NULL DEFAULT '',
        fetched_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        payload TEXT NOT NULL
      );
    `);

    const priceColumns = this.database.prepare("PRAGMA table_info(price_datasets)").all() as unknown as Array<{
      name: string;
    }>;
    if (!priceColumns.some((column) => column.name === "source_url")) {
      this.database.exec("ALTER TABLE price_datasets ADD COLUMN source_url TEXT NOT NULL DEFAULT ''");
    }

    this.setMeta("schema_version", String(DATABASE_SCHEMA_VERSION));
  }
}

export class SqliteLogScanCache implements LogScanCachePort {
  constructor(private readonly database: CollectorDatabase) {}

  async read(filePath: string): Promise<LogScanSnapshot | null> {
    return this.database.readScanSnapshot(normalizeLogPath(filePath));
  }

  async write(snapshot: Omit<LogScanSnapshot, "version" | "normalizedPath" | "anchor">): Promise<LogScanSnapshot> {
    const nextSnapshot: LogScanSnapshot = {
      ...snapshot,
      version: SCAN_CACHE_VERSION,
      normalizedPath: normalizeLogPath(snapshot.filePath),
      anchor: await createAnchor(snapshot.filePath, snapshot.fileSize)
    };
    this.database.writeScanSnapshot(nextSnapshot);
    return nextSnapshot;
  }

  async matchesAnchor(filePath: string, snapshot: LogScanSnapshot): Promise<boolean> {
    if (snapshot.fileSize === 0) {
      return true;
    }

    if (!snapshot.anchor) {
      return false;
    }

    const current = await readAnchorAt(filePath, snapshot.anchor.start, snapshot.anchor.byteLength);
    return current?.sha256 === snapshot.anchor.sha256;
  }
}

export async function importLegacyLogCache(userDataPath: string, database: CollectorDatabase): Promise<number> {
  if (database.getMeta("legacy_log_cache_imported") === "1") {
    return 0;
  }

  const directory = path.join(userDataPath, "log-scan-cache");
  let entries: string[] = [];

  try {
    entries = (await readdir(directory)).filter((name) => name.endsWith(".json"));
  } catch {
    database.setMeta("legacy_log_cache_imported", "1");
    return 0;
  }

  let imported = 0;
  for (const entry of entries) {
    try {
      const parsed = JSON.parse(await readFile(path.join(directory, entry), "utf8")) as LogScanSnapshot;
      if (parsed.version !== SCAN_CACHE_VERSION || !Array.isArray(parsed.draws) || typeof parsed.normalizedPath !== "string") {
        continue;
      }
      database.writeScanSnapshot(parsed);
      imported += 1;
    } catch {
      // Corrupt legacy cache entries are intentionally skipped.
    }
  }

  database.setMeta("legacy_log_cache_imported", "1");
  return imported;
}

function openDatabase(databasePath: string): DatabaseSync {
  const parent = path.dirname(databasePath);
  mkdirSync(parent, { recursive: true });
  return new DatabaseSync(databasePath);
}

function insertRunItem(statement: StatementSync, runId: string, item: RunItem, index: number): void {
  statement.run(
    item.id,
    runId,
    item.role,
    item.detailsId,
    item.name,
    item.amount,
    item.provenance,
    item.templateItemId ?? null,
    item.comment ?? null,
    item.icon ?? null,
    item.priceOverrideChaos ?? null,
    index
  );
}

function mapRun(row: RunRow, itemStatement: StatementSync, observationStatement: StatementSync): CollectionRun {
  const items = itemStatement.all(row.id) as unknown as RunItemRow[];
  const observations = observationStatement.all(row.id) as unknown as Array<{ observation_id: string }>;

  return {
    id: row.id,
    title: row.title,
    template: row.template_snapshot ? JSON.parse(row.template_snapshot) : null,
    leagueId: row.league_id,
    gameVersion: row.game_version,
    runCount: Number(row.run_count),
    durationSeconds: row.duration_seconds === null ? undefined : Number(row.duration_seconds),
    notes: row.notes,
    lifecycle: row.lifecycle,
    origin: row.origin,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    exportedAt: row.exported_at ?? undefined,
    items: items.map(mapRunItem),
    observationIds: observations.map((entry) => entry.observation_id)
  };
}

function mapRunItem(row: RunItemRow): RunItem {
  return {
    id: row.id,
    role: row.role,
    detailsId: row.details_id,
    name: row.name,
    amount: Number(row.amount),
    provenance: row.provenance,
    templateItemId: row.template_item_id === null ? undefined : Number(row.template_item_id),
    comment: row.comment ?? undefined,
    icon: row.icon ?? undefined,
    priceOverrideChaos: row.price_override_chaos === null ? undefined : Number(row.price_override_chaos)
  };
}

function mapDrawRow(row: { id: string; line_number: number; occurred_at: string; payload: string }): ClientLogDraw {
  const payload = JSON.parse(row.payload) as { cardName?: unknown };
  return {
    id: row.id,
    lineNumber: Number(row.line_number),
    timestamp: row.occurred_at,
    cardName: typeof payload.cardName === "string" ? payload.cardName : "Unknown card"
  };
}

function parseNullableJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function createAnchor(filePath: string, fileSize: number): Promise<LogScanAnchor | null> {
  if (fileSize === 0) {
    return null;
  }
  const byteLength = Math.min(4096, fileSize);
  return readAnchorAt(filePath, fileSize - byteLength, byteLength);
}

async function readAnchorAt(filePath: string, start: number, byteLength: number): Promise<LogScanAnchor | null> {
  const file = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(byteLength);
    const { bytesRead } = await file.read(buffer, 0, byteLength, start);
    if (bytesRead !== byteLength) {
      return null;
    }
    return {
      start,
      byteLength,
      sha256: createHash("sha256").update(buffer).digest("hex")
    };
  } finally {
    await file.close();
  }
}

interface RunRow {
  id: string;
  title: string;
  template_snapshot: string | null;
  league_id: string;
  game_version: string;
  run_count: number;
  duration_seconds: number | null;
  notes: string;
  lifecycle: CollectionRun["lifecycle"];
  origin: CollectionRun["origin"];
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  exported_at: string | null;
}

interface RunItemRow {
  id: string;
  role: RunItem["role"];
  details_id: string;
  name: string;
  amount: number;
  provenance: RunItem["provenance"];
  template_item_id: number | null;
  comment: string | null;
  icon: string | null;
  price_override_chaos: number | null;
}

interface ScanCheckpointRow {
  normalized_path: string;
  file_path: string;
  file_size: number;
  lines_read: number;
  scanned_at: string;
  pending_draw: string | null;
  anchor: string | null;
}

interface PriceDatasetRow {
  cache_key: string;
  source: MarketPriceDataset["source"];
  league_id: string;
  dataset_key: string;
  source_url: string;
  fetched_at: string;
  expires_at: string;
  payload: string;
}
