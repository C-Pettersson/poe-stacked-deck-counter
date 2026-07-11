import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SOURCE_PACKAGE = "poe-custom-elements@0.4.0";
const OUTPUT_DIRECTORY = path.resolve("src/renderer/assets/divination-cards");
const METADATA_PATH = path.resolve("src/renderer/assets/divination-card-data.json");
const UNLISTED_CARD_ART = [
  { name: "Damnation", artFilename: "Damnation" },
  { name: "Duality", artFilename: "Duality" },
  { name: "Last Stand", artFilename: "LastStand" }
];

async function main() {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "wfn-divination-art-"));

  try {
    const npmArguments = ["pack", SOURCE_PACKAGE, "--pack-destination", temporaryDirectory];
    const { stdout } = process.env.npm_execpath
      ? await execFileAsync(process.execPath, [process.env.npm_execpath, ...npmArguments])
      : await execFileAsync(process.platform === "win32" ? "npm.cmd" : "npm", npmArguments, {
          shell: process.platform === "win32"
        });
    const archivePath = path.join(temporaryDirectory, stdout.trim().split(/\r?\n/).at(-1));
    await execFileAsync("tar", ["-xf", archivePath, "-C", temporaryDirectory]);

    const packageDirectory = path.join(temporaryDirectory, "package");
    const cardDataPath = path.join(packageDirectory, "dist/elements/divination-card/cardElementData.json");
    const sourceDirectory = path.join(packageDirectory, "public/poe-ce-assets/divination-card/cards/avif");
    const cards = [...JSON.parse(await readFile(cardDataPath, "utf8")), ...UNLISTED_CARD_ART];

    await mkdir(OUTPUT_DIRECTORY, { recursive: true });
    const expectedFiles = new Set(cards.map((card) => `${detailsIdFromName(card.name)}.avif`));
    const existingFiles = await readdir(OUTPUT_DIRECTORY);
    await Promise.all(
      existingFiles
        .filter((fileName) => !expectedFiles.has(fileName))
        .map((fileName) => rm(path.join(OUTPUT_DIRECTORY, fileName)))
    );

    await Promise.all(
      cards.map((card) =>
        copyFile(
          path.join(sourceDirectory, `${card.artFilename}.avif`),
          path.join(OUTPUT_DIRECTORY, `${detailsIdFromName(card.name)}.avif`)
        )
      )
    );

    await writeFile(
      METADATA_PATH,
      `${JSON.stringify(cards.map(normalizeCardMetadata))}\n`,
      "utf8"
    );

    process.stdout.write(`Synced ${cards.length} local divination-card artworks and metadata from ${SOURCE_PACKAGE}.\n`);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

function normalizeCardMetadata(card) {
  const rewardHtml = card.rewardHtml ?? "";

  return {
    name: card.name,
    stackSize: card.stackSize ?? null,
    rewardLines: [...rewardHtml.matchAll(/<p>(.*?)<\/p>/g)].map((line) =>
      [...line[1].matchAll(/<span class=(?:"([^"]+)"|([^ >]+))>(.*?)<\/span>/g)].map((segment) => ({
        text: decodeHtml(segment[3]),
        tone: normalizeRewardTone((segment[1] ?? segment[2]).split(/\s+/))
      }))
    ),
    flavourText: card.flavourText ?? "",
    dropLevel: card.dropLevel?.label ?? null
  };
}

function normalizeRewardTone(classes) {
  return classes.find((className) => !/^size\d+$/.test(className)) ?? "default";
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/gi, "'");
}

function detailsIdFromName(name) {
  return name
    .normalize("NFKD")
    .replace(/[^\w\s'-]/g, "")
    .replace(/['\"]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

await main();
