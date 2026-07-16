import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

const mockListAgencies = vi.fn()
const mockGenerate = vi.fn()
const mockCreateAdmin = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockCreateAdmin(),
}))

vi.mock('@/lib/ai/dashboard-insights-cron', () => ({
  listActiveAgencyIds: (...args: unknown[]) => mockListAgencies(...args),
  generateAndCacheAgencyInsights: (...args: unknown[]) => mockGenerate(...args),
}))

function makeRequest(secret: string | null): NextRequest {
  const init: ConstructorParameters<typeof NextRequest>[1] = {}
  if (secret) {
    init.headers = { authorization: `Bearer ${secret}` }
  }
  return new NextRequest('http://localhost/api/cron/dashboard-insights', init)
}

describe('GET /api/cron/dashboard-insights', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', 'test-cron-secret')
    mockCreateAdmin.mockReturnValue({})
    mockListAgencies.mockResolvedValue(['agency-1'])
    mockGenerate.mockResolvedValue({ agencyId: 'agency-1', ok: true, empty: false })
  })

  it('returns 401 without Bearer CRON_SECRET', async () => {
    const res = await GET(makeRequest(null))
    expect(res.status).toBe(401)
  })

  it('returns 401 with wrong secret', async () => {
    const res = await GET(makeRequest('wrong'))
    expect(res.status).toBe(401)
  })

  it('processes active agencies when authorized', async () => {
    const res = await GET(makeRequest('test-cron-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.agencies).toBe(1)
    expect(body.succeeded).toBe(1)
    expect(mockGenerate).toHaveBeenCalledOnce()
  })
})
