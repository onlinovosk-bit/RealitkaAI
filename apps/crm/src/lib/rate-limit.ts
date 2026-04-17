/**
 * Jednoduchý sliding-window rate limit (in-memory).
 * Pri viacerých inštanciách servera každá drží vlastný počet — pre presný limit použiť Redis/Upstash.
 */

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

function pruneWindow(timestamps: number[], windowMs: number, now: number): number[] {
  const start = now - windowMs;
  return timestamps.filter((t) => t > start);
}

export function createSlidingWindowLimiter(options: {
  windowMs: number;
  max: number;
}) {
  const buckets = new Map<string, number[]>();

  return function check(key: string, now = Date.now()): RateLimitResult {
    let ts = buckets.get(key) ?? [];
    ts = pruneWindow(ts, options.windowMs, now);
    if (ts.length >= options.max) {
      const oldest = ts[0]!;
      const retryAfterSec = Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000));
      buckets.set(key, ts);
      return { ok: false, retryAfterSec };
    }
    ts.push(now);
    buckets.set(key, ts);
    return { ok: true };
  };
}

export function getClientIpFromRequest(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}
