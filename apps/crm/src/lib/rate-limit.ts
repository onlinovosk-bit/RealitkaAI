const counters = new Map<string, { count: number; resetAt: number }>();
export function rateLimit(key: string, max: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const e = counters.get(key);
  if (!e || now > e.resetAt) {
    counters.set(key, { count: 1, resetAt: now + 60_000 });
    return { allowed: true, remaining: max - 1 };
  }
  if (e.count >= max) return { allowed: false, remaining: 0 };
  e.count++;
  return { allowed: true, remaining: max - e.count };
}
