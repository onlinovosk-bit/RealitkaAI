import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { signUnsubscribeToken } from '@/lib/email/unsubscribe-token'
import { hashEmail } from '@/lib/email/suppression'

const upsert = vi.fn()
const updateEq = vi.fn()
const update = vi.fn(() => ({ eq: updateEq }))
const from = vi.fn((table: string) => (table === 'email_suppressions' ? { upsert } : { update }))
const mockAdmin = vi.fn()

const mockRateLimit = vi.fn()
const mockMetric = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({ createServiceRoleClient: () => mockAdmin() }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: (...a: unknown[]) => mockRateLimit(...a) }))
vi.mock('@/lib/usage-metrics', async (orig) => ({
  ...(await orig<typeof import('@/lib/usage-metrics')>()),
  incrementUsageMetric: (...a: unknown[]) => mockMetric(...a),
}))

const AGENCY = '11111111-1111-4111-8111-111111111111'
const PROFILE = '22222222-2222-4222-8222-222222222222'

import { GET, POST } from '../route'

const req = (token: string | null, method = 'GET') =>
  new NextRequest(`http://localhost/api/unsubscribe${token ? `?t=${token}` : ''}`, { method })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('UNSUBSCRIBE_TOKEN_SECRET', 'test-unsubscribe-secret-0123456789abcdef')
  mockAdmin.mockReturnValue({ from })
  mockRateLimit.mockResolvedValue({ allowed: true, remaining: 19 })
  mockMetric.mockResolvedValue(undefined)
  upsert.mockResolvedValue({ error: null })
  updateEq.mockResolvedValue({ error: null })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.unstubAllEnvs())

describe('GET /api/unsubscribe — confirmation only', () => {
  it('shows a form and writes nothing (mail scanners prefetch links)', async () => {
    const t = signUnsubscribeToken({ t: 'o', h: hashEmail('jan@example.com'), a: AGENCY })!
    const res = await GET(req(t))
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('method="post"')
    expect(from).not.toHaveBeenCalled()
  })

  it('400 for a missing or forged token', async () => {
    expect((await GET(req(null))).status).toBe(400)
    expect((await GET(req('abc.def'))).status).toBe(400)
  })
})

describe('POST /api/unsubscribe — executes', () => {
  it('suppresses the address hash for the sending agency', async () => {
    const h = hashEmail('jan@example.com')
    const res = await POST(req(signUnsubscribeToken({ t: 'o', h, a: AGENCY })!, 'POST'))
    expect(res.status).toBe(200)
    expect(upsert).toHaveBeenCalledWith(
      { email_hash: h, scope_key: AGENCY, reason: 'unsubscribe', source: 'unsubscribe-link' },
      expect.objectContaining({ onConflict: 'email_hash,scope_key,reason' }),
    )
  })

  it('disables the morning brief for the profile in the token', async () => {
    const res = await POST(req(signUnsubscribeToken({ t: 'b', p: PROFILE })!, 'POST'))
    expect(res.status).toBe(200)
    expect(update).toHaveBeenCalledWith({ enabled: false })
    expect(updateEq).toHaveBeenCalledWith('profile_id', PROFILE)
  })

  it('does not claim success when the write fails', async () => {
    upsert.mockResolvedValue({ error: { message: 'boom' } })
    const t = signUnsubscribeToken({ t: 'o', h: hashEmail('a@b.sk'), a: AGENCY })!
    expect((await POST(req(t, 'POST'))).status).toBe(500)
  })

  it('503 without a service-role client, 400 for a forged token, no writes', async () => {
    mockAdmin.mockReturnValue(null)
    const t = signUnsubscribeToken({ t: 'b', p: PROFILE })!
    expect((await POST(req(t, 'POST'))).status).toBe(503)
    expect((await POST(req('forged.token', 'POST'))).status).toBe(400)
    expect(from).not.toHaveBeenCalled()
  })
})

describe('POST /api/unsubscribe — public write endpoint guards', () => {
  it('rate-limits per IP before touching the token or the DB', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 })
    const t = signUnsubscribeToken({ t: 'o', h: hashEmail('jan@example.com'), a: AGENCY })!
    const res = await POST(req(t, 'POST'))
    expect(res.status).toBe(429)
    expect(from).not.toHaveBeenCalled()
    expect(mockMetric).not.toHaveBeenCalled()
  })

  it('counts a confirmed unsubscribe against the sending agency', async () => {
    const t = signUnsubscribeToken({ t: 'o', h: hashEmail('jan@example.com'), a: AGENCY })!
    const res = await POST(req(t, 'POST'))
    expect(res.status).toBe(200)
    expect(mockMetric).toHaveBeenCalledWith({ agencyId: AGENCY, metric: 'unsubscribe_confirmed' })
  })

  it('does not count a failed write', async () => {
    upsert.mockResolvedValue({ error: { message: 'boom' } })
    const t = signUnsubscribeToken({ t: 'o', h: hashEmail('jan@example.com'), a: AGENCY })!
    const res = await POST(req(t, 'POST'))
    expect(res.status).toBe(500)
    expect(mockMetric).not.toHaveBeenCalled()
  })

  it('rejects a missing token with the invalid page, not JSON', async () => {
    const res = await POST(req(null, 'POST'))
    expect(res.status).toBe(400)
    expect(res.headers.get('content-type')).toContain('text/html')
  })
})
