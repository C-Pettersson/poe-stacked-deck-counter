import type { DeckSession } from "../shared/types.js";

export function resolveSelectedSessionId(sessions: DeckSession[], selectedSessionId: string | null): string | null {
  if (sessions.length === 0) {
    return null;
  }

  if (selectedSessionId && sessions.some((session) => session.id === selectedSessionId)) {
    return selectedSessionId;
  }

  return sessions[0].id;
}

export function resolveSelectedSession(sessions: DeckSession[], selectedSessionId: string | null): DeckSession | null {
  const resolvedId = resolveSelectedSessionId(sessions, selectedSessionId);
  return resolvedId ? sessions.find((session) => session.id === resolvedId) ?? null : null;
}
