import { USER_AGENT } from "./config.ts";

const cache = new Map<string, { allowed: boolean; fetchedAt: number }>();

export async function isPathAllowedByRobots(
  origin: string,
  pathname: string,
): Promise<boolean> {
  const key = `${origin}|${pathname}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < 3600_000) return hit.allowed;

  let allowed = true;
  try {
    const robotsUrl = new URL("/robots.txt", origin).toString();
    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      cache.set(key, { allowed: true, fetchedAt: Date.now() });
      return true;
    }
    const text = await res.text();
    allowed = parseRobotsForPath(text, pathname, USER_AGENT);
  } catch {
    allowed = true;
  }
  cache.set(key, { allowed, fetchedAt: Date.now() });
  return allowed;
}

export function parseRobotsForPath(robotsTxt: string, pathname: string, agent = "*"): boolean {
  const lines = robotsTxt.split(/\r?\n/);
  let applies = false;
  const disallows: string[] = [];

  for (const raw of lines) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const [directive, ...rest] = line.split(":").map((s) => s.trim());
    const value = rest.join(":").trim();
    const d = directive.toLowerCase();

    if (d === "user-agent") {
      applies = value === "*" || value.toLowerCase() === agent.toLowerCase();
    } else if (applies && d === "disallow" && value) {
      disallows.push(value);
    }
  }

  for (const rule of disallows) {
    if (rule === "/") return false;
    if (pathname.startsWith(rule)) return false;
  }
  return true;
}
