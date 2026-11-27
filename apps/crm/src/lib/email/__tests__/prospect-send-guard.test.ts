import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hashEmail } from '@/lib/email/suppression'
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token'

const AGENCY = '11111111-1111-4111-8111-111111111111'

function fakeClient(opts: { suppressed?: boolean; error?: { message: string } | null } = {}) {
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'in', 'limit']) chain[m] = () => chain
  chain.then = (res: (v: unknown) => void) =>
    res({
      data: opts.suppressed ? [{ reason: 'unsubscribe' }] : [],
      error: opts.error ?? null,
    })
  return { from: () => chain }
}

beforeEach(() => {
  vi.stubEnv('UNSUBSCRIBE_TOKEN_SECRET', 'test-unsubscribe-secret-0123456789abcdef')
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.revolis.ai')
})
afterEach(() => vi.unstubAllEnvs())

describe('guardProspectEmailSend', () => {
  it('blocks a suppressed address before any send', async () => {
    const { guardProspectEmailSend } = await import('../prospect-send-guard')
    const res = await guardProspectEmailSend({
      to: 'jan@example.com',
      agencyId: AGENCY,
      client: fakeClient({ suppressed: true }) as never,
    })
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/odhlásených|nedoručiteľných/) })
  })

  it('fail-closes when agencyId is missing (no SYSTEM_USAGE scope)', async () => {
    const { guardProspectEmailSend } = await import('../prospect-send-guard')
    const res = await guardProspectEmailSend({
      to: 'jan@example.com',
      agencyId: null,
      client: fakeClient() as never,
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/Agentúra/)
  })

  it('returns signed List-Unsubscribe URL scoped to the agency', async () => {
    const { guardProspectEmailSend } = await import('../prospect-send-guard')
    const res = await guardProspectEmailSend({
      to: 'Jan@Example.com',
      agencyId: AGENCY,
      client: fakeClient() as never,
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
    const url = /<(https:\/\/[^>]+)>/.exec(res.headers['List-Unsubscribe'])?.[1]
    expect(url).toContain('/api/unsubscribe?t=')
    const token = new URL(url!).searchParams.get('t')
    expect(verifyUnsubscribeToken(token)).toEqual({
      t: 'o',
      h: hashEmail('jan@example.com'),
      a: AGENCY,
    })
  })

  it('fail-closes without UNSUBSCRIBE_TOKEN_SECRET', async () => {
    vi.stubEnv('UNSUBSCRIBE_TOKEN_SECRET', '')
    const { guardProspectEmailSend } = await import('../prospect-send-guard')
    const res = await guardProspectEmailSend({
      to: 'a@b.sk',
      agencyId: AGENCY,
      client: fakeClient() as never,
    })
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/UNSUBSCRIBE_TOKEN_SECRET/) })
  })
})
