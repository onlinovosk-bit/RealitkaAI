import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../route'

const mockGetProfile = vi.fn()
const mockFrom = vi.fn()
const mockCreateClient = vi.fn(async () => ({ from: mockFrom }))

vi.mock('@/lib/auth', () => ({
  getCurrentProfile: () => mockGetProfile(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

vi.mock('@/lib/ai-insights/personalization', () => ({
  personalizeInsights: (actions: unknown[]) => actions,
}))

vi.mock('@/lib/ai-insights/history', () => ({
  getUserHistory: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/ai-insights/analytics', () => ({
  logAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
}))

const PROFILE = {
  id: 'profile-1',
  agency_id: 'agency-1',
  full_name: 'Test Maklér',
  email: 'test@example.com',
}

const FRESH_CACHE = {
  payload: {
    headline: 'Cache hit headline',
    summary: 'Cache hit summary',
    actions: [{
      title: 'Akcia z cache',
      description: 'Popis',
      recommendedChannel: 'call',
      relatedLeadIds: ['lead-1'],
      impact: 'high',
    }],
    period: 'today',
    displayName: 'Test Maklér',
  },
  generated_at: new Date().toISOString(),
}

function mockCacheRow(row: { payload: unknown; generated_at: string } | null, error: { message: string } | null = null) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: row, error }),
      }),
    }),
  })
}

describe('POST /api/dashboard/insights', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetProfile.mockResolvedValue(PROFILE)
  })

  it('returns 401 without profile', async () => {
    mockGetProfile.mockResolvedValue(null)
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('returns empty state when agency has no cache row', async () => {
    mockCacheRow(null)
    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cacheStatus).toBe('missing')
    expect(body.actions).toHaveLength(0)
    expect(body.headline).toContain('Test Maklér')
    expect(body.summary).toMatch(/lead|nehnuteľnost/i)
    expect(body.summary).not.toMatch(/Prešov|Košic|150–250k|80 %/)
  })

  it('returns empty state when profile has no agency_id', async () => {
    mockGetProfile.mockResolvedValue({ ...PROFILE, agency_id: null })
    const res = await POST()
    const body = await res.json()
    expect(body.cacheStatus).toBe('missing')
    expect(body.actions).toHaveLength(0)
  })

  it('returns cache hit for fresh payload', async () => {
    mockCacheRow(FRESH_CACHE)
    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cacheStatus).toBe('hit')
    expect(body.headline).toBe('Cache hit headline')
    expect(body.generatedAt).toBe(FRESH_CACHE.generated_at)
  })

  it('treats stale cache as miss (TTL 24h)', async () => {
    const stale = {
      ...FRESH_CACHE,
      generated_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    }
    mockCacheRow(stale)
    const res = await POST()
    const body = await res.json()
    expect(body.cacheStatus).toBe('missing')
    expect(body.actions).toHaveLength(0)
  })

  it('returns 500 on cache read error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }),
        }),
      }),
    })
    const res = await POST()
    expect(res.status).toBe(500)
  })
})
