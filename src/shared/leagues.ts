import type { LeagueInfo } from "./types.js";

export const LEAGUE_SOURCE_URL = "https://www.poewiki.net/wiki/League";

export const CHALLENGE_LEAGUES: LeagueInfo[] = [
  {
    id: "mirage",
    name: "Mirage",
    poeNinjaName: "Mirage",
    poeNinjaSlug: "mirage",
    startsAt: "2026-03-06T19:00:00Z",
    endsAt: "2026-07-20T21:00:00Z",
    version: "3.28.0"
  },
  {
    id: "keepers",
    name: "Keepers",
    poeNinjaName: "Keepers",
    poeNinjaSlug: "keepers",
    startsAt: "2025-10-31T19:00:00Z",
    endsAt: "2026-03-02T21:00:00Z",
    version: "3.27.0"
  },
  {
    id: "mercenaries",
    name: "Mercenaries",
    poeNinjaName: "Mercenaries",
    poeNinjaSlug: "mercenaries",
    startsAt: "2025-06-13T20:00:00Z",
    endsAt: "2025-10-27T21:00:00Z",
    version: "3.26.0"
  },
  {
    id: "settlers",
    name: "Settlers",
    poeNinjaName: "Settlers",
    poeNinjaSlug: "settlers",
    startsAt: "2024-07-26T20:00:00Z",
    endsAt: "2025-06-09T22:00:00Z",
    version: "3.25.0"
  },
  {
    id: "necropolis",
    name: "Necropolis",
    poeNinjaName: "Necropolis",
    poeNinjaSlug: "necropolis",
    startsAt: "2024-03-29T20:00:00Z",
    endsAt: "2024-07-23T22:00:00Z",
    version: "3.24.0"
  },
  {
    id: "affliction",
    name: "Affliction",
    poeNinjaName: "Affliction",
    poeNinjaSlug: "affliction",
    startsAt: "2023-12-08T19:00:00Z",
    endsAt: "2024-03-26T21:00:00Z",
    version: "3.23.0"
  },
  {
    id: "ancestor",
    name: "Ancestor",
    poeNinjaName: "Ancestors",
    poeNinjaSlug: "ancestors",
    startsAt: "2023-08-18T20:00:00Z",
    endsAt: "2023-12-05T21:00:00Z",
    version: "3.22.0"
  },
  {
    id: "crucible",
    name: "Crucible",
    poeNinjaName: "Crucible",
    poeNinjaSlug: "crucible",
    startsAt: "2023-04-07T20:00:00Z",
    endsAt: "2023-08-15T22:00:00Z",
    version: "3.21.0"
  },
  {
    id: "sanctum",
    name: "Sanctum",
    poeNinjaName: "Sanctum",
    poeNinjaSlug: "sanctum",
    startsAt: "2022-12-09T19:00:00Z",
    endsAt: "2023-04-04T21:00:00Z",
    version: "3.20.0"
  },
  {
    id: "kalandra",
    name: "Kalandra",
    poeNinjaName: "Kalandra",
    poeNinjaSlug: "kalandra",
    startsAt: "2022-08-19T20:00:00Z",
    endsAt: "2022-12-06T20:00:00Z",
    version: "3.19.0"
  },
  {
    id: "standard",
    name: "Standard",
    poeNinjaName: "Standard",
    poeNinjaSlug: "standard",
    startsAt: "2013-10-23T00:00:00Z",
    endsAt: null,
    version: "permanent"
  }
];

export function getLeagueById(id: string): LeagueInfo {
  return CHALLENGE_LEAGUES.find((league) => league.id === id) ?? CHALLENGE_LEAGUES[0];
}

export function getDefaultLeague(now = new Date()): LeagueInfo {
  return matchLeagueByDate(now) ?? CHALLENGE_LEAGUES[0];
}

export function matchLeagueByDate(value: Date | string): LeagueInfo | null {
  const date = typeof value === "string" ? new Date(value) : value;
  const time = date.getTime();

  return (
    CHALLENGE_LEAGUES.find((league) => {
      if (league.id === "standard") {
        return false;
      }

      const startsAt = new Date(league.startsAt).getTime();
      const endsAt = league.endsAt ? new Date(league.endsAt).getTime() : Number.POSITIVE_INFINITY;
      return time >= startsAt && time <= endsAt;
    }) ?? null
  );
}
