import fs from "node:fs";
import path from "node:path";
import { FETCH_TIMEOUT_MS, RATE_LIMIT_MS_PER_DOMAIN, USER_AGENT } from "./config.ts";
import { isDeniedFetchUrl } from "./denylist.ts";
import { isPathAllowedByRobots } from "./robots.ts";
import { CACHE_DIR } from "./paths.ts";

const lastFetchByDomain = new Map<string, number>();

function cacheKey(url: string): string {
  return url.replace(/[^a-z0-9]+/gi, "_").slice(0, 120);
}

export function getCachedHtml(url: string): string | null {
  const file = path.join(CACHE_DIR, `${cacheKey(url)}.html`);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf8");
}

export function writeCachedHtml(url: string, html: string): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, `${cacheKey(url)}.html`), html, "utf8");
}

async function rateLimitWait(hostname: string): Promise<void> {
  const last = lastFetchByDomain.get(hostname) ?? 0;
  const wait = RATE_LIMIT_MS_PER_DOMAIN - (Date.now() - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetchByDomain.set(hostname, Date.now());
}

export type FetchResult =
  | { ok: true; html: string; url: string; fromCache: boolean }
  | { ok: false; reason: "denied" | "robots" | "timeout" | "http" | "network"; detail?: string };

export async function fetchPage(url: string, opts?: { useCache?: boolean }): Promise<FetchResult> {
  if (isDeniedFetchUrl(url)) {
    return { ok: false, reason: "denied", detail: url };
  }

  if (opts?.useCache !== false) {
    const cached = getCachedHtml(url);
    if (cached) return { ok: true, html: cached, url, fromCache: true };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "network", detail: "invalid url" };
  }

  const allowed = await isPathAllowedByRobots(parsed.origin, parsed.pathname || "/");
  if (!allowed) return { ok: false, reason: "robots", detail: parsed.pathname };

  await rateLimitWait(parsed.hostname);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, reason: "http", detail: String(res.status) };
    const html = await res.text();
    writeCachedHtml(url, html);
    return { ok: true, html, url, fromCache: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("timeout") || msg.includes("aborted")) {
      return { ok: false, reason: "timeout", detail: msg };
    }
    return { ok: false, reason: "network", detail: msg };
  }
}
