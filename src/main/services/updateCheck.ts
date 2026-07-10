import {
  APP_LATEST_RELEASE_API_URLS,
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
  const response = await fetchLatestRelease();

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

async function fetchLatestRelease(): Promise<Response> {
  let lastStatus = 0;

  for (const url of APP_LATEST_RELEASE_API_URLS) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: "application/vnd.github+json",
          "user-agent": APP_UPDATE_USER_AGENT
        },
        redirect: "follow",
        signal: AbortSignal.timeout(10_000)
      });

      if (response.ok) {
        return response;
      }

      lastStatus = response.status;
    } catch {
      // Try the legacy repository URL before surfacing the failure.
    }
  }

  throw new Error(`Update check failed${lastStatus ? ` (${lastStatus})` : ""}.`);
}
