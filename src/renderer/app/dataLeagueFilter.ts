import { getLeagueById } from "../../shared/leagues.js";
import type { DeckSession } from "../../shared/types.js";

export const SELECTED_SESSION_FILTER_ID = "selected-session";
export const ALL_LEAGUES_FILTER_ID = "all-leagues";

export type DataLeagueFilterId =
  | typeof SELECTED_SESSION_FILTER_ID
  | typeof ALL_LEAGUES_FILTER_ID
  | `league:${string}`;

export function createLeagueFilterId(leagueId: string): DataLeagueFilterId {
  return `league:${leagueId}`;
}

export function getDataFilterSessions(
  sessions: DeckSession[],
  selectedSession: DeckSession | null,
  filterId: DataLeagueFilterId
): DeckSession[] {
  if (filterId === SELECTED_SESSION_FILTER_ID) {
    return selectedSession ? [selectedSession] : sessions;
  }

  const leagueId = getLeagueIdFromDataFilter(filterId);
  if (leagueId) {
    return sessions.filter((session) => session.leagueId === leagueId);
  }

  return sessions;
}

export function getDataFilterTitle(filterId: DataLeagueFilterId): string {
  if (filterId === SELECTED_SESSION_FILTER_ID) {
    return "Selected Session";
  }

  const leagueId = getLeagueIdFromDataFilter(filterId);
  return leagueId ? `${getLeagueById(leagueId).name} League` : "All Leagues";
}

export function countSessionsByLeague(sessions: DeckSession[]): Map<string, number> {
  return sessions.reduce((counts, session) => {
    counts.set(session.leagueId, (counts.get(session.leagueId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

function getLeagueIdFromDataFilter(filterId: DataLeagueFilterId): string | null {
  return filterId.startsWith("league:") ? filterId.slice("league:".length) : null;
}
