/** Precomputed insights validity — cron runs 2x daily; stale rows are treated as cache miss. */
export const DASHBOARD_INSIGHTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000

export function isDashboardInsightsCacheFresh(
  generatedAt: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!generatedAt) return false
  const ts = new Date(generatedAt).getTime()
  if (Number.isNaN(ts)) return false
  return nowMs - ts < DASHBOARD_INSIGHTS_CACHE_TTL_MS
}
