export const APP_RELEASES_URL = "https://github.com/C-Pettersson/wraeclast-field-notes/releases";
export const APP_LATEST_RELEASE_API_URLS = [
  "https://api.github.com/repos/C-Pettersson/wraeclast-field-notes/releases/latest",
  "https://api.github.com/repos/C-Pettersson/poe-stacked-deck-counter/releases/latest"
] as const;
export const APP_UPDATE_USER_AGENT = "wraeclast-field-notes";

export function normalizeVersionLabel(version: string): string {
  return version.trim().replace(/^v/i, "");
}

export function isVersionNewer(candidateVersion: string, currentVersion: string): boolean {
  const candidate = parseVersion(candidateVersion);
  const current = parseVersion(currentVersion);

  if (!candidate || !current) {
    return false;
  }

  for (let index = 0; index < candidate.length; index += 1) {
    if (candidate[index] > current[index]) {
      return true;
    }

    if (candidate[index] < current[index]) {
      return false;
    }
  }

  return false;
}

function parseVersion(version: string): [number, number, number] | null {
  const match = normalizeVersionLabel(version).match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);

  if (!match) {
    return null;
  }

  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}
