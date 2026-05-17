/** Exponential backoff: 30s * 2^n, cap 30 minutes. */
export function computeBackoffRunAfterISO(
  retryCount: number,
  nowMs: number = Date.now(),
): string {
  const baseMs = 30_000;
  const capMs = 30 * 60_000;
  const delta = Math.min(capMs, baseMs * 2 ** retryCount);
  return new Date(nowMs + delta).toISOString();
}
