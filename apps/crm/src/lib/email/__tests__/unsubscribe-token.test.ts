import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { signUnsubscribeToken, unsubscribeUrl, verifyUnsubscribeToken } from '../unsubscribe-token'
import { hashEmail, normalizeEmail } from '../suppression'

const AGENCY = '11111111-1111-4111-8111-111111111111'
const PROFILE = '22222222-2222-4222-8222-222222222222'
const HASH = hashEmail('jan@example.com')

beforeEach(() => {
  vi.stubEnv('UNSUBSCRIBE_TOKEN_SECRET', 'test-unsubscribe-secret-0123456789abcdef')
})
afterEach(() => vi.unstubAllEnvs())

describe('unsubscribe token', () => {
  it('round-trips an outreach payload', () => {
    const t = signUnsubscribeToken({ t: 'o', h: HASH, a: AGENCY })!
    expect(verifyUnsubscribeToken(t)).toEqual({ t: 'o', h: HASH, a: AGENCY })
  })

  it('round-trips a brief payload', () => {
    const t = signUnsubscribeToken({ t: 'b', p: PROFILE })!
    expect(verifyUnsubscribeToken(t)).toEqual({ t: 'b', p: PROFILE })
  })

  it('rejects a tampered body (bare UUID swap, the old IDOR)', () => {
    const t = signUnsubscribeToken({ t: 'b', p: PROFILE })!
    const [, sig] = t.split('.')
    const forged = Buffer.from(JSON.stringify({ t: 'b', p: AGENCY })).toString('base64url')
    expect(verifyUnsubscribeToken(`${forged}.${sig}`)).toBeNull()
  })

  it('rejects a token signed with another secret', () => {
    const t = signUnsubscribeToken({ t: 'b', p: PROFILE })!
    vi.stubEnv('UNSUBSCRIBE_TOKEN_SECRET', 'a-different-secret-0123456789abcdefgh')
    expect(verifyUnsubscribeToken(t)).toBeNull()
  })

  it('rejects garbage, empty and oversized input', () => {
    for (const bad of [null, undefined, '', 'x', 'a.b.c', `${'a'.repeat(2000)}.b`, PROFILE]) {
      expect(verifyUnsubscribeToken(bad as string)).toBeNull()
    }
  })

  it('refuses to sign or verify without a long-enough secret (fail-closed)', () => {
    const t = signUnsubscribeToken({ t: 'b', p: PROFILE })!
    vi.stubEnv('UNSUBSCRIBE_TOKEN_SECRET', 'short')
    expect(signUnsubscribeToken({ t: 'b', p: PROFILE })).toBeNull()
    expect(verifyUnsubscribeToken(t)).toBeNull()
    vi.stubEnv('UNSUBSCRIBE_TOKEN_SECRET', '')
    expect(unsubscribeUrl('https://app.revolis.ai', { t: 'b', p: PROFILE })).toBeNull()
  })

  it('refuses to sign a payload that is not a hash / UUID', () => {
    expect(signUnsubscribeToken({ t: 'o', h: 'jan@example.com', a: AGENCY } as never)).toBeNull()
    expect(signUnsubscribeToken({ t: 'o', h: HASH, a: 'agency-A' })).toBeNull()
  })

  it('builds an absolute URL on the confirmation endpoint', () => {
    const url = unsubscribeUrl('https://app.revolis.ai/', { t: 'b', p: PROFILE })!
    expect(url.startsWith('https://app.revolis.ai/api/unsubscribe?t=')).toBe(true)
  })
})

describe('address hashing', () => {
  it('normalises case, whitespace and display-name form', () => {
    expect(normalizeEmail(' Jan Novák <JAN@Example.com> ')).toBe('jan@example.com')
    expect(hashEmail('JAN@example.com ')).toBe(hashEmail('jan@example.com'))
    expect(HASH).toMatch(/^[0-9a-f]{64}$/)
  })
})
