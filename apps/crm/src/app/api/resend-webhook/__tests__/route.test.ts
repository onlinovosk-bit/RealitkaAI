// ================================================================
// Revolis.AI — /api/resend-webhook end-to-end na úrovni endpointu
//
// Podpis sa tu NEMOCKUJE. Test posiela hlavičky presne v tom tvare, v akom
// ich posiela Svix, a podpis počíta tou istou funkciou, ktorá je proti
// skutočnej knižnici overená zamrznutým vektorom v
// `lib/webhooks/__tests__/standard-webhooks.test.ts`.
//
// Bez toho by test dokázal len to, že endpoint zavolá mock — nie to, že
// skutočná doručenka z Resendu ním prejde. A práve to bola tá chyba:
// endpoint porovnával hex HMAC nad telom a vracal 401 každej doručenke.
// ================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { signStandardWebhook } from '@/lib/webhooks/standard-webhooks'

const mockRecord = vi.fn()
const mockStoreReply = vi.fn()
const mockAdmin = vi.fn()

vi.mock('@/lib/events/email-engagement', () => ({
  recordEmailEngagement: (...args: unknown[]) => mockRecord(...args),
}))

vi.mock('@/lib/email-tracking', () => ({
  storeReply: (...args: unknown[]) => mockStoreReply(...args),
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockAdmin(),
}))

const SECRET = 'whsec_cmV2b2xpcy10ZXN0LWtleS0wMTIzNDU2Nzg5'
const ID = 'msg_test'

const ADMIN = { __kind: 'admin-client' }

function post(body: unknown, opts: { secret?: string; skew?: number; rawSig?: string } = {}) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body)
  const ts = Math.floor(Date.now() / 1000) + (opts.skew ?? 0)
  const sig = opts.rawSig ?? signStandardWebhook(opts.secret ?? SECRET, ID, ts, raw)
  return new Request('http://localhost/api/resend-webhook', {
    method: 'POST',
    headers: {
      'svix-id': ID,
      'svix-timestamp': String(ts),
      'svix-signature': sig,
    },
    body: raw,
  })
}

function opened(leadId: string | null) {
  return {
    type: 'email.opened',
    created_at: '2026-09-30T20:00:00.000Z',
    data: leadId ? { tags: { lead_id: leadId } } : { tags: {} },
  }
}

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  process.env.RESEND_WEBHOOK_SECRET = SECRET
  mockAdmin.mockReturnValue(ADMIN)
  mockRecord.mockResolvedValue({ recorded: true, reason: null })
  warn = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  warn.mockRestore()
})

describe('POST /api/resend-webhook', () => {
  it('správne podpísané otvorenie zapíše udalosť', async () => {
    const { POST } = await import('@/app/api/resend-webhook/route')
    const res = await POST(post(opened('lead-123')) as never)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      ok: true,
      handled: 'email.opened',
      recorded: true,
      reason: null,
    })

    // Service-role klient, nie cookie klient — webhook nemá session
    // (EVENTS-WRITE-PATH-01).
    expect(mockRecord).toHaveBeenCalledWith(ADMIN, {
      leadId: 'lead-123',
      kind: 'opened',
      occurredAt: '2026-09-30T20:00:00.000Z',
    })
  })

  it('klik pošle kind=clicked', async () => {
    const { POST } = await import('@/app/api/resend-webhook/route')
    await POST(post({ ...opened('lead-9'), type: 'email.clicked' }) as never)
    expect(mockRecord.mock.calls[0][1].kind).toBe('clicked')
  })

  it('PINUJE OPRAVU: stará hex schéma dostane 401', async () => {
    const { POST } = await import('@/app/api/resend-webhook/route')
    const raw = JSON.stringify(opened('lead-123'))
    const crypto = await import('node:crypto')
    const legacy = crypto.createHmac('sha256', SECRET).update(raw).digest('hex')

    const res = await POST(post(raw, { rawSig: legacy }) as never)

    expect(res.status).toBe(401)
    expect(mockRecord).not.toHaveBeenCalled()
  })

  it('iné tajomstvo dostane 401', async () => {
    const { POST } = await import('@/app/api/resend-webhook/route')
    const res = await POST(post(opened('lead-123'), { secret: 'whsec_aW5lLXRham9tc3R2bw==' }) as never)
    expect(res.status).toBe(401)
    expect(mockRecord).not.toHaveBeenCalled()
  })

  it('stará doručenka (replay) dostane 401', async () => {
    const { POST } = await import('@/app/api/resend-webhook/route')
    const res = await POST(post(opened('lead-123'), { skew: -3600 }) as never)
    expect(res.status).toBe(401)
  })

  it('bez RESEND_WEBHOOK_SECRET vracia 503, nie 200', async () => {
    // Chýbajúca premenná je chyba konfigurácie, nie povolenie (#717).
    delete process.env.RESEND_WEBHOOK_SECRET
    const { POST } = await import('@/app/api/resend-webhook/route')
    const res = await POST(post(opened('lead-123')) as never)

    expect(res.status).toBe(503)
    expect(mockRecord).not.toHaveBeenCalled()
  })

  it('otvorenie bez lead_id tagu prizná, že nezapísalo', async () => {
    const { POST } = await import('@/app/api/resend-webhook/route')
    const res = await POST(post(opened(null)) as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.recorded).toBe(false)
    expect(body.reason).toContain('lead_id')
    expect(mockRecord).not.toHaveBeenCalled()
  })

  it('nezapísaný engagement sa v odpovedi nezatají', async () => {
    mockRecord.mockResolvedValueOnce({ recorded: false, reason: 'lead x nemá makléra ani agentúru' })
    const { POST } = await import('@/app/api/resend-webhook/route')
    const res = await POST(post(opened('lead-x')) as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.recorded).toBe(false)
    expect(body.reason).toContain('nemá makléra')
  })

  it('legacy inbound odpoveď ide do storeReply', async () => {
    const { POST } = await import('@/app/api/resend-webhook/route')
    const res = await POST(
      post({ to: 'lead+abc-123@revolis.ai', text: 'mám záujem', date: '2026-09-30T21:00:00Z' }) as never,
    )

    expect(res.status).toBe(200)
    expect(mockStoreReply).toHaveBeenCalledWith({
      leadId: 'abc-123',
      content: 'mám záujem',
      receivedAt: '2026-09-30T21:00:00Z',
    })
  })
})
