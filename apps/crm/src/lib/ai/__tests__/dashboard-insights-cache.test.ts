import { describe, expect, it } from 'vitest'
import {
  DASHBOARD_INSIGHTS_CACHE_TTL_MS,
  isDashboardInsightsCacheFresh,
} from '../dashboard-insights-cache'

describe('dashboard-insights-cache', () => {
  it('TTL is 24 hours', () => {
    expect(DASHBOARD_INSIGHTS_CACHE_TTL_MS).toBe(24 * 60 * 60 * 1000)
  })

  it('is fresh within TTL', () => {
    const now = Date.parse('2026-06-11T12:00:00.000Z')
    const generatedAt = '2026-06-11T06:00:00.000Z'
    expect(isDashboardInsightsCacheFresh(generatedAt, now)).toBe(true)
  })

  it('is stale after TTL', () => {
    const now = Date.parse('2026-06-12T13:00:00.000Z')
    const generatedAt = '2026-06-11T06:00:00.000Z'
    expect(isDashboardInsightsCacheFresh(generatedAt, now)).toBe(false)
  })

  it('rejects missing generated_at', () => {
    expect(isDashboardInsightsCacheFresh(null)).toBe(false)
    expect(isDashboardInsightsCacheFresh(undefined)).toBe(false)
  })
})
