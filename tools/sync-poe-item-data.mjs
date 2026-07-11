import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DEFAULT_POB_ROOT = path.join(ROOT, "tmp", "PathOfBuilding-dev", "src", "Data");
const OUTPUT = path.join(ROOT, "src", "itemTooltip", "generated", "poe-item-data.json");
const MOD_OUTPUT = path.join(ROOT, "src", "itemTooltip", "generated", "poe-mod-data.json");
const POB_COMMIT = "b7c15bc2b451dc0d37f2ce83489159682fdfdb84";
const sourceRoot = path.resolve(readArgument("--pob-root") ?? DEFAULT_POB_ROOT);

const bases = await readBases(path.join(sourceRoot, "Bases"));
const flavourText = await readFlavourText(path.join(sourceRoot, "FlavourText.lua"));
const uniques = await readUniques(path.join(sourceRoot, "Uniques"), flavourText);
const modifiers = await readModifiers(sourceRoot);
const payload = {
  version: `pob:${POB_COMMIT}`,
  bases: bases.sort(sortByName),
  uniques: uniques.sort(sortByName)
};

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(payload)}\n`, "utf8");
await writeFile(MOD_OUTPUT, `${JSON.stringify({ version: payload.version, modifiers })}\n`, "utf8");
console.log(`Wrote ${payload.bases.length} bases, ${payload.uniques.length} uniques, and ${modifiers.length} modifier definitions.`);

async function readBases(directory) {
  const definitions = [];
  for (const file of await luaFiles(directory)) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/itemBases\["((?:\\.|[^"\\])+)"\]\s*=\s*\{([\s\S]*?)\n\}/g)) {
      const body = match[2];
      const armourBody = fieldTable(body, "armour");
      definitions.push({
        name: decodeLuaString(match[1]),
        itemType: fieldString(body, "type") ?? "Item",
        ...(fieldString(body, "subType") ? { subType: fieldString(body, "subType") } : {}),
        ...(fieldString(body, "implicit") ? { implicit: fieldString(body, "implicit") } : {}),
        requirements: numberFields(fieldTable(body, "req"), ["level", "str", "dex", "int"]),
        ...(armourBody ? {
          armour: compact({
            blockChance: fieldNumber(armourBody, "BlockChance"),
            armourMin: fieldNumber(armourBody, "ArmourBaseMin"),
            armourMax: fieldNumber(armourBody, "ArmourBaseMax"),
            evasionMin: fieldNumber(armourBody, "EvasionBaseMin"),
            evasionMax: fieldNumber(armourBody, "EvasionBaseMax"),
            energyShieldMin: fieldNumber(armourBody, "EnergyShieldBaseMin"),
            energyShieldMax: fieldNumber(armourBody, "EnergyShieldBaseMax"),
            movementPenalty: fieldNumber(armourBody, "MovementPenalty")
          })
        } : {})
      });
    }
  }
  return definitions;
}

async function readUniques(directory, flavourByName) {
  const definitions = [];
  for (const file of await luaFiles(directory, true)) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/\[\[\r?\n([\s\S]*?)\r?\n\]\]/g)) {
      const lines = match[1].split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (lines.length < 3) continue;
      const implicitIndex = lines.findIndex((line) => /^Implicits:\s*\d+/i.test(line));
      const modifierIndex = implicitIndex >= 2
        ? implicitIndex + 1
        : lines.findIndex((line, index) => index >= 2 && !isUniqueMetadata(line));
      if (modifierIndex < 2) continue;
      const name = cleanMarkup(lines[0]);
      const baseType = cleanMarkup(lines[1]);
      const metadata = lines.slice(2, implicitIndex >= 2 ? implicitIndex : modifierIndex);
      const variantNames = metadata.filter((line) => line.startsWith("Variant: ")).map((line) => line.slice(9));
      const currentIndex = variantNames.findIndex((variant) => variant === "Current");
      const selectedVariant = currentIndex >= 0 ? currentIndex + 1 : 1;
      const implicitCount = implicitIndex >= 2 ? Number(lines[implicitIndex].match(/\d+/)?.[0] ?? 0) : 0;
      const modifiers = lines.slice(modifierIndex)
        .filter((line) => appliesToVariant(line, selectedVariant))
        .map(cleanModifier)
        .filter(Boolean);
      const levelRequirement = metadata
        .map((line) => line.match(/^(?:LevelReq:|Requires Level)\s*(\d+)/i)?.[1])
        .find(Boolean);
      const sourceText = metadata.find((line) => line.startsWith("Source: "))?.slice(8);
      definitions.push(compact({
        name,
        baseType,
        levelRequirement: levelRequirement ? Number(levelRequirement) : undefined,
        implicitModifiers: modifiers.slice(0, implicitCount),
        explicitModifiers: modifiers.slice(implicitCount),
        sourceText: sourceText ? cleanMarkup(sourceText) : undefined,
        flavourText: flavourByName.get(name)
      }));
    }
  }
  return definitions;
}

function isUniqueMetadata(line) {
  return /^(?:Requires Level\s+\d+|(?:League|Source|Upgrade|Variant|LevelReq|Talisman Tier|Has Alt Variant(?: Two| Three)?|Selected (?:Alt )?Variant(?: Two| Three)?):)/i.test(line);
}

async function readFlavourText(file) {
  const source = await readFile(file, "utf8");
  const byName = new Map();
  for (const match of source.matchAll(/\[\d+\]\s*=\s*\{([\s\S]*?)\n\t\},(?=\n\t\[\d+\]|\n\})/g)) {
    const body = match[1];
    const name = namedString(body, "name");
    const textBody = body.match(/\btext\s*=\s*\{([\s\S]*?)\n\s*\},/)?.[1] ?? "";
    const lines = [...textBody.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((entry) => cleanMarkup(decodeLuaString(entry[1])));
    if (name && lines.length) byName.set(name, lines.join("\n"));
  }
  return byName;
}

async function readModifiers(directory) {
  const files = (await luaFiles(directory)).filter((file) => /^Mod(?!Cache).*\.lua$/i.test(path.basename(file)));
  const definitions = [];
  for (const file of files) {
    const family = path.basename(file, ".lua").slice(3).replace(/([a-z])([A-Z])/g, "$1 $2");
    const source = await readFile(file, "utf8");
    for (const line of source.split(/\r?\n/)) {
      const id = line.match(/^\s*\["((?:\\.|[^"\\])+)"\]\s*=\s*\{/)?.[1];
      if (!id) continue;
      const statOrderIndex = line.indexOf("statOrder =");
      const header = statOrderIndex >= 0 ? line.slice(0, statOrderIndex) : line;
      const headerStrings = [...header.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((match) => decodeLuaString(match[1]));
      const type = namedString(line, "type");
      const affix = namedString(line, "affix");
      const tagValues = namedStringArray(line, "modTags");
      const weightKeys = namedStringArray(line, "weightKey");
      const weightValues = namedNumberArray(line, "weightVal");
      const metadataStrings = new Set([decodeLuaString(id), type, affix].filter(Boolean));
      definitions.push(compact({
        id: decodeLuaString(id),
        family,
        generationType: type,
        name: affix || undefined,
        requiredLevel: namedNumber(line, "level"),
        group: namedString(line, "group"),
        lines: headerStrings.filter((value) => value && !metadataStrings.has(value)),
        tags: tagValues,
        spawnWeights: weightKeys.map((tag, index) => ({ tag, weight: weightValues[index] ?? 0 }))
      }));
    }
  }
  return definitions.sort((left, right) => left.id.localeCompare(right.id) || left.family.localeCompare(right.family));
}

async function luaFiles(directory, recursive = false) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isFile() && entry.name.endsWith(".lua")) files.push(target);
    if (recursive && entry.isDirectory()) files.push(...await luaFiles(target, true));
  }
  return files;
}

function appliesToVariant(line, selectedVariant) {
  const tag = line.match(/^\{variant:([\d,]+)\}/);
  return !tag || tag[1].split(",").map(Number).includes(selectedVariant);
}

function cleanModifier(value) {
  return cleanMarkup(value.replace(/^(?:\{[^}]+\})+/, "")).trim();
}

function cleanMarkup(value) {
  return value
    .replace(/\b(?:normal|magic|rare|unique|currency|gem|divination|corrupted|crafted|custom)\{([^}]*)\}/gi, "$1")
    .replace(/\^\d+/g, "");
}

function fieldString(body, key) {
  const match = body.match(new RegExp(`(?:^|\\n)\\s*${key}\\s*=\\s*"((?:\\\\.|[^"\\\\])*)"`));
  return match ? decodeLuaString(match[1]) : undefined;
}

function fieldNumber(body, key) {
  const match = body?.match(new RegExp(`\\b${key}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`));
  return match ? Number(match[1]) : undefined;
}

function namedString(body, key) {
  const match = body.match(new RegExp(`\\b${key}\\s*=\\s*"((?:\\\\.|[^"\\\\])*)"`));
  return match ? decodeLuaString(match[1]) : undefined;
}

function namedNumber(body, key) {
  const match = body.match(new RegExp(`\\b${key}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`));
  return match ? Number(match[1]) : undefined;
}

function namedStringArray(body, key) {
  const table = body.match(new RegExp(`\\b${key}\\s*=\\s*\\{([^}]*)\\}`))?.[1] ?? "";
  return [...table.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((match) => decodeLuaString(match[1]));
}

function namedNumberArray(body, key) {
  const table = body.match(new RegExp(`\\b${key}\\s*=\\s*\\{([^}]*)\\}`))?.[1] ?? "";
  return [...table.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
}

function fieldTable(body, key) {
  return body?.match(new RegExp(`\\b${key}\\s*=\\s*\\{([^}]*)\\}`))?.[1];
}

function numberFields(body, fields) {
  return Object.fromEntries(fields.map((field) => [field, fieldNumber(body, field)]).filter(([, value]) => value !== undefined));
}

function decodeLuaString(value) {
  return value.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && (!(entry && typeof entry === "object") || Object.keys(entry).length > 0)));
}

function sortByName(left, right) {
  return left.name.localeCompare(right.name) || (left.baseType ?? "").localeCompare(right.baseType ?? "");
}

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
