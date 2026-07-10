import { access, cp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface IdentityMigrationResult {
  status: "imported" | "new-data-present" | "no-legacy-data" | "already-checked";
  sourcePath?: string;
}

const MIGRATION_MARKER = "identity-migration-v1.json";
const LEGACY_DATA_ENTRIES = ["settings.json", "log-scan-cache", "price-cache"] as const;

export async function migrateLegacyIdentity(appDataPath: string, newUserDataPath: string): Promise<IdentityMigrationResult> {
  await mkdir(newUserDataPath, { recursive: true });
  const markerPath = path.join(newUserDataPath, MIGRATION_MARKER);

  if (await exists(markerPath)) {
    return { status: "already-checked" };
  }

  if (await hasNewIdentityData(newUserDataPath)) {
    const result: IdentityMigrationResult = { status: "new-data-present" };
    await writeMarker(markerPath, result);
    return result;
  }

  const candidates = [
    path.join(appDataPath, "PoE Stacked Deck Counter"),
    path.join(appDataPath, "poe-stacked-deck-counter")
  ];
  const sourcePath = await findLegacyDataPath(candidates, newUserDataPath);

  if (!sourcePath) {
    const result: IdentityMigrationResult = { status: "no-legacy-data" };
    await writeMarker(markerPath, result);
    return result;
  }

  for (const entry of LEGACY_DATA_ENTRIES) {
    const source = path.join(sourcePath, entry);
    if (!(await exists(source))) {
      continue;
    }
    await cp(source, path.join(newUserDataPath, entry), {
      recursive: true,
      force: false,
      errorOnExist: false
    });
  }

  const result: IdentityMigrationResult = { status: "imported", sourcePath };
  await writeMarker(markerPath, result);
  return result;
}

async function hasNewIdentityData(userDataPath: string): Promise<boolean> {
  return (await exists(path.join(userDataPath, "collector.db"))) || (await exists(path.join(userDataPath, "settings.json")));
}

async function findLegacyDataPath(candidates: string[], newUserDataPath: string): Promise<string | null> {
  const normalizedNewPath = path.resolve(newUserDataPath).toLowerCase();
  for (const candidate of candidates) {
    if (path.resolve(candidate).toLowerCase() === normalizedNewPath) {
      continue;
    }
    if ((await exists(path.join(candidate, "settings.json"))) || (await exists(path.join(candidate, "log-scan-cache")))) {
      return candidate;
    }
  }
  return null;
}

async function writeMarker(markerPath: string, result: IdentityMigrationResult): Promise<void> {
  await writeFile(
    markerPath,
    `${JSON.stringify({ version: 1, checkedAt: new Date().toISOString(), ...result }, null, 2)}\n`,
    "utf8"
  );
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}
