import react from "@vitejs/plugin-react";
import { mkdir } from "node:fs/promises";
import { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { CHALLENGE_LEAGUES, getLeagueById } from "./src/shared/leagues";
import { buildSessions } from "./src/shared/sessions";
import type { Settings } from "./src/shared/types";
import { scanClientLog } from "./src/main/services/logScanner";
import { PriceCache } from "./src/main/services/priceCache";
import { DEFAULT_LOG_PATH, defaultSettings } from "./src/main/services/settings";
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  plugins: [react(), browserPreviewApi()],
  build: {
    outDir: "dist/renderer",
    emptyOutDir: true
  },
  server: {
    port: 5173,
    strictPort: true
  }
});

function browserPreviewApi() {
  const userDataPath = path.join(process.cwd(), ".cache", "browser-preview");
  const priceCache = new PriceCache(userDataPath);

  return {
    name: "browser-preview-api",
    async configureServer(server) {
      await mkdir(userDataPath, { recursive: true });

      server.middlewares.use(async (request: IncomingMessage, response: ServerResponse, next) => {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");

        if (!url.pathname.startsWith("/__poe-preview/")) {
          next();
          return;
        }

        try {
          if (request.method === "GET" && url.pathname === "/__poe-preview/settings") {
            sendJson(response, defaultSettings());
            return;
          }

          if (request.method === "GET" && url.pathname === "/__poe-preview/leagues") {
            sendJson(response, CHALLENGE_LEAGUES);
            return;
          }

          if (request.method === "GET" && url.pathname === "/__poe-preview/prices") {
            const leagueId = url.searchParams.get("leagueId") ?? getLeagueById(defaultSettings().selectedLeagueId).id;
            const forceRefresh = url.searchParams.get("forceRefresh") === "true";
            sendJson(response, await priceCache.getPrices(getLeagueById(leagueId), forceRefresh));
            return;
          }

          if (request.method === "POST" && url.pathname === "/__poe-preview/scan") {
            const body = await readJsonBody<{ filePath?: string; settings?: Settings }>(request);
            const settings = body.settings ?? defaultSettings();
            const filePath = body.filePath || settings.logPath || DEFAULT_LOG_PATH;
            const result = await scanClientLog(filePath);

            sendJson(response, {
              filePath,
              fileSize: result.fileSize,
              scannedAt: new Date().toISOString(),
              draws: result.draws,
              sessions: buildSessions(result.draws, null, settings.sessionLeagueOverrides)
            });
            return;
          }

          response.statusCode = 404;
          sendJson(response, { error: "Not found" });
        } catch (error) {
          response.statusCode = 500;
          sendJson(response, { error: error instanceof Error ? error.message : "Preview API failed" });
        }
      });
    }
  };
}

function sendJson(response: ServerResponse, payload: unknown): void {
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {} as T;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}
