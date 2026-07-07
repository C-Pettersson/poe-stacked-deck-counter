import {
  APP_LATEST_RELEASE_API_URL,
  APP_RELEASES_URL,
  APP_UPDATE_USER_AGENT,
  isVersionNewer,
  normalizeVersionLabel
} from "../../shared/appUpdate.js";
import type { AppInfo, AppUpdateInfo } from "../../shared/types.js";

interface GitHubReleaseResponse {
  tag_name?: unknown;
  html_url?: unknown;
}

export function getAppInfo(version: string): AppInfo {
  return {
    version,
    releasesUrl: APP_RELEASES_URL
  };
}

export async function checkForUpdate(currentVersion: string): Promise<AppUpdateInfo> {
  const response = await fetch(APP_LATEST_RELEASE_API_URL, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": APP_UPDATE_USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error(`Update check failed (${response.status}).`);
  }

  const payload = (await response.json()) as GitHubReleaseResponse;
  const tagName = typeof payload.tag_name === "string" ? payload.tag_name : "";
  const latestVersion = normalizeVersionLabel(tagName);

  if (!latestVersion) {
    throw new Error("Latest release did not include a version.");
  }

  return {
    currentVersion,
    latestVersion,
    releaseUrl: typeof payload.html_url === "string" ? payload.html_url : APP_RELEASES_URL,
    checkedAt: new Date().toISOString(),
    updateAvailable: isVersionNewer(latestVersion, currentVersion)
  };
}
