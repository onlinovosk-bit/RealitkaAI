import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockListMatches = vi.fn()
const mockRateLimit = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}))

vi.mock('@/lib/ai/rate-guard', () => ({
  checkAiRateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

vi.mock('@/lib/arbitrage/list-matches', () => ({
  listMatchesForProfile: (...args: unknown[]) => mockListMatches(...args),
}))

vi.mock('@/lib/arbitrage/demo-guard', () => ({
  isArbitrageDemoAllowed: vi.fn(() => false),
}))

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/arbitrage/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/arbitrage/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockRateLimit.mockResolvedValue(null)
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { id: 'profile-1' }, error: null }),
        }),
      }),
    })
    mockListMatches.mockResolvedValue([])
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(401)
  })

  it('returns live empty state without Kováč/Šimko demo names', async () => {
    const res = await POST(makeRequest({ limit: 20 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.source).toBe('live')
    expect(body.empty).toBe(true)
    expect(body.candidates).toEqual([])
    const json = JSON.stringify(body)
    expect(json).not.toMatch(/Kováč|Šimko/)
  })

  it('maps live matches to candidates with real ids', async () => {
    mockListMatches.mockResolvedValue([
      {
        id: 'match-uuid-1',
        profile_id: 'profile-1',
        listing_portal: 'p1',
        listing_bazos: 'b1',
        price_portal: 200000,
        price_bazos: 150000,
        delta_eur: 50000,
        delta_pct: 25,
        match_score: 0.85,
        match_reasons: ['same_street'],
        city: 'Bratislava',
        address_display: 'Test 1',
        price_drop_count: 0,
        days_on_market: 10,
        seller_is_private: true,
        status: 'new',
        dismissed_reason: null,
        lead_id: null,
        detected_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        portal_listing: {
          title: 'Portal flat',
          source: 'nehnutelnosti_sk',
          seller_name: 'Seller A',
        },
        bazos_listing: {
          title: 'Bazos flat',
          seller_phone: '+421900000000',
        },
      },
    ])

    const res = await POST(makeRequest({}))
    const body = await res.json()
    expect(body.source).toBe('live')
    expect(body.empty).toBe(false)
    expect(body.candidates).toHaveLength(1)
    expect(body.candidates[0].id).toBe('match-uuid-1')
    expect(JSON.stringify(body)).not.toMatch(/Kováč|Šimko/)
  })

  it('ignores demo:true when isArbitrageDemoAllowed is false', async () => {
    const { isArbitrageDemoAllowed } = await import('@/lib/arbitrage/demo-guard')
    vi.mocked(isArbitrageDemoAllowed).mockReturnValue(false)

    const res = await POST(makeRequest({ demo: true }))
    const body = await res.json()
    expect(body.source).toBe('live')
    expect(body.empty).toBe(true)
    expect(JSON.stringify(body)).not.toMatch(/Kováč|Šimko/)
  })

  it('returns demo candidates only when demo guard allows', async () => {
    const { isArbitrageDemoAllowed } = await import('@/lib/arbitrage/demo-guard')
    vi.mocked(isArbitrageDemoAllowed).mockReturnValue(true)

    const res = await POST(makeRequest({ demo: true }))
    const body = await res.json()
    expect(body.source).toBe('demo')
    expect(body.candidates.length).toBeGreaterThan(0)
    expect(body.candidates[0].name).toMatch(/Kováč|Šimková/)
  })
})
