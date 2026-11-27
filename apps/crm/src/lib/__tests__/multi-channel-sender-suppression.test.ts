import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockResendSend = vi.hoisted(() => vi.fn())
const mockFetchLeadAgencyId = vi.hoisted(() => vi.fn())
const mockGuard = vi.hoisted(() => vi.fn())

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockResendSend }
  },
}))
vi.mock('@/lib/outbound-orchestrator', () => ({
  fetchLeadAgencyId: (...a: unknown[]) => mockFetchLeadAgencyId(...a),
}))
vi.mock('@/lib/email/prospect-send-guard', () => ({
  guardProspectEmailSend: (...a: unknown[]) => mockGuard(...a),
}))

const AGENCY = '11111111-1111-4111-8111-111111111111'

import { sendMessage } from '../multi-channel-sender'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('RESEND_API_KEY', 're_test')
  vi.stubEnv('OUTREACH_FROM_EMAIL', 'rk@example.com')
  mockFetchLeadAgencyId.mockResolvedValue(AGENCY)
  mockGuard.mockResolvedValue({
    ok: true,
    agencyId: AGENCY,
    unsubUrl: 'https://app.revolis.ai/api/unsubscribe?t=tok',
    footerText: '\n\n--\nunsub',
    headers: {
      'List-Unsubscribe': '<https://app.revolis.ai/api/unsubscribe?t=tok>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })
  mockResendSend.mockResolvedValue({ data: { id: 're-1' }, error: null })
})
afterEach(() => vi.unstubAllEnvs())

describe('multi-channel sendEmail — EMAIL-SUPPRESSION-01', () => {
  it('does not call Resend when the address is suppressed', async () => {
    mockGuard.mockResolvedValueOnce({
      ok: false,
      error: 'Adresa je na zozname odhlásených alebo nedoručiteľných — odoslanie zastavené.',
    })
    const res = await sendMessage({
      leadId: 'lead-1',
      to: 'jan@example.com',
      channel: 'email',
      subject: 'S',
      body: 'B',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/odhlásených/)
    expect(mockResendSend).not.toHaveBeenCalled()
    expect(mockGuard).toHaveBeenCalledWith({ to: 'jan@example.com', agencyId: AGENCY })
  })

  it('attaches List-Unsubscribe headers and footer on a clean send', async () => {
    const res = await sendMessage({
      leadId: 'lead-1',
      to: 'jan@example.com',
      channel: 'email',
      subject: 'S',
      body: 'Schválený text',
    })
    expect(res).toMatchObject({ ok: true, messageId: 're-1' })
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('Schválený text'),
        headers: expect.objectContaining({
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        }),
      }),
    )
  })
})
