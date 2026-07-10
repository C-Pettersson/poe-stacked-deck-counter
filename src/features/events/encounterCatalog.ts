import type { CatalogItem } from "../../domain/collection.js";
import type { EncounterNotificationSettings } from "../../shared/types.js";

export interface EncounterDefinition {
  id: string;
  title: string;
  boss: string;
  areaNames: string[];
  areaIds: string[];
  wikiUrl: string;
  poedbUrl: string;
  completionLines?: string[];
  rewards?: CatalogItem[];
}

const POE_CDN = "https://web.poecdn.com/image/Art/2DItems";

const shaperRewards: CatalogItem[] = [
  item("shapers-touch", "Shaper's Touch", `${POE_CDN}/Armours/Gloves/ShapersGloves.png?scale=1&w=2&h=2`),
  item("voidwalker", "Voidwalker", `${POE_CDN}/Armours/Boots/CrossingTheVoid.png?scale=1&w=2&h=2`),
  item("solstice-vigil", "Solstice Vigil", `${POE_CDN}/Amulets/ShapersPresence.png?scale=1&w=2&h=2`),
  item("dying-sun", "Dying Sun", `${POE_CDN}/Flasks/ShapersFlask.png?scale=1&w=1&h=2`),
  item("echoes-of-creation", "Echoes of Creation", `${POE_CDN}/Armours/Helmets/TheTwistingScream.png?scale=1&w=2&h=2`),
  item("entropic-devastation", "Entropic Devastation", `${POE_CDN}/Armours/Gloves/UberShaperGloves.png?scale=1&w=2&h=2`),
  item("the-tides-of-time", "The Tides of Time", `${POE_CDN}/Belts/UberShaperBelt.png?scale=1&w=2&h=1`),
  item("starforge", "Starforge", `${POE_CDN}/Weapons/TwoHandWeapons/TwoHandSwords/Starforge.png?scale=1&w=2&h=4`),
  item("sublime-vision", "Sublime Vision", `${POE_CDN}/Jewels/SublimeVision.png?scale=1&w=1&h=1`)
];

export const ENCOUNTER_DEFINITIONS: EncounterDefinition[] = [
  {
    id: "the-shaper",
    title: "The Shaper",
    boss: "The Shaper",
    areaNames: ["The Shaper's Realm"],
    areaIds: ["MapWorldsShapersRealm", "MapWorldsShapersRealmUber"],
    wikiUrl: "https://www.poewiki.net/wiki/The_Shaper%27s_Realm",
    poedbUrl: "https://poedb.tw/us/The_Shaper",
    completionLines: [
      "Cast once more into the infinite void. Inconsequential...",
      "Death comes for us all, eventually. Even you...",
      "You should pray that it does not reach you first...",
      "Savour this moment of victory. There will not be another.",
      "Your vile acts ripple outwards... can't you feel it...?",
      "Oh... Where am I...? Zana? My little girl? You're all grown up..."
    ],
    rewards: shaperRewards
  },
  {
    id: "uber-elder",
    title: "Uber Elder",
    boss: "The Elder and The Shaper",
    areaNames: ["The Shaper's Realm"],
    areaIds: ["MapWorldsElderArenaUber"],
    wikiUrl: "https://www.poewiki.net/wiki/Uber_Elder",
    poedbUrl: "https://poedb.tw/us/Uber_Elder"
  },
  encounter("the-elder", "The Elder", "The Elder", "Absence of Value and Meaning", "MapWorldsElderArena", "Absence_of_Value_and_Meaning", "The_Elder"),
  encounter("the-maven", "The Maven", "The Maven", "Absence of Mercy and Empathy", "MavenBoss", "Absence_of_Mercy_and_Empathy", "The_Maven"),
  encounter("searing-exarch", "The Searing Exarch", "The Searing Exarch", "Absence of Patience and Wisdom", "MapWorldsPrimordialBoss3", "Absence_of_Patience_and_Wisdom", "The_Searing_Exarch"),
  encounter("eater-of-worlds", "The Eater of Worlds", "The Eater of Worlds", "Absence of Symmetry and Harmony", "MapWorldsPrimordialBoss4", "Absence_of_Symmetry_and_Harmony", "The_Eater_of_Worlds"),
  encounter("infinite-hunger", "The Infinite Hunger", "The Infinite Hunger", "Seething Chyme", "MapWorldsPrimordialBoss1", "Seething_Chyme", "The_Infinite_Hunger"),
  encounter("black-star", "The Black Star", "The Black Star", "Polaric Void", "MapWorldsPrimordialBoss2", "Polaric_Void", "The_Black_Star"),
  encounter("sirus", "Sirus", "Sirus, Awakener of Worlds", "Eye of the Storm", "AtlasExilesBoss5", "Eye_of_the_Storm", "Sirus,_Awakener_of_Worlds"),
  encounter("mavens-crucible", "Maven's Invitation", "Captured bosses", "The Maven's Crucible", "MavenHub", "The_Maven%27s_Crucible", "Maven%27s_Invitation")
];

export function findEncounterDefinition(areaName: string, areaId?: string): EncounterDefinition | null {
  if (areaId) {
    const byId = ENCOUNTER_DEFINITIONS.find((definition) => definition.areaIds.includes(areaId));
    if (byId) return byId;
  }

  const normalized = normalize(areaName);
  return ENCOUNTER_DEFINITIONS.find((definition) => definition.areaNames.some((name) => normalize(name) === normalized)) ?? null;
}

export function getEncounterDefinition(id: string): EncounterDefinition | null {
  return ENCOUNTER_DEFINITIONS.find((definition) => definition.id === id) ?? null;
}

export function defaultEncounterNotificationSettings(): EncounterNotificationSettings {
  return {
    enabled: true,
    triggers: {
      entered: false,
      completion: false,
      exited: true
    },
    encounters: Object.fromEntries(
      ENCOUNTER_DEFINITIONS.map((definition) => [
        definition.id,
        {
          enabled: definition.id !== "the-shaper",
          sound: definition.id !== "the-shaper"
        }
      ])
    )
  };
}

function encounter(
  id: string,
  title: string,
  boss: string,
  areaName: string,
  areaId: string,
  wikiSlug: string,
  poedbSlug: string
): EncounterDefinition {
  return {
    id,
    title,
    boss,
    areaNames: [areaName],
    areaIds: [areaId],
    wikiUrl: `https://www.poewiki.net/wiki/${wikiSlug}`,
    poedbUrl: `https://poedb.tw/us/${poedbSlug}`
  };
}

function item(detailsId: string, name: string, icon: string): CatalogItem {
  return { detailsId, name, icon };
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}
