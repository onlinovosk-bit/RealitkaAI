// ================================================================
// Revolis.AI — ENGAGEMENT-EMAIL-01: otvorenie e-mailu ako trvalá udalosť
//
// Prvý skutočný engagement signál. Doteraz webhook z Resendu zapisoval do
// `new Map()` v pamäti procesu — na serverless tá mapa zmizne s inštanciou
// a `getEmailEngagement` nemal v repe ani jedného volajúceho. Signál sa
// prijímal a zahadzoval.
//
// `events.profile_id` je NOT NULL a 24 aktívnych leadov nemá priradeného
// makléra, preto je tu záloha na aktívny profil tej istej agentúry. Bez nej by
// sa udalosť pre nepriradený lead ticho stratila — a práve čerstvý,
// nepriradený lead je ten, o ktorého záujem stojí najviac.
// ================================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockLogEventDetailed = vi.fn()

vi.mock('@/lib/events/log-event', () => ({
  logEventDetailed: (...args: unknown[]) => mockLogEventDetailed(...args),
}))

import { recordEmailEngagement, resolveProfileForLead } from '../email-engagement'

const LEAD    = 'lead-123'
const AGENT   = '55555555-5555-5555-5555-555555555555'
const KOLEGA  = '66666666-6666-6666-6666-666666666666'
const AGENCY  = '77777777-7777-7777-7777-777777777777'

interface Options {
  lead?:      { assigned_profile_id: string | null; agency_id: string | null } | null
  leadError?: string
  fallback?:  { id: string } | null
  fallbackError?: string
}

function client({ lead = null, leadError, fallback = null, fallbackError }: Options) {
  return {
    from: (table: string) => {
      const builder: Record<string, unknown> = {}
      const chain = () => builder
      Object.assign(builder, {
        select: chain, eq: chain, limit: chain,
        single: () =>
          Promise.resolve(
            leadError ? { data: null, error: { message: leadError } } : { data: lead, error: null },
          ),
        maybeSingle: () =>
          Promise.resolve(
            fallbackError
              ? { data: null, error: { message: fallbackError } }
              : { data: fallback, error: null },
          ),
        __table: table,
      })
      return builder
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLogEventDetailed.mockResolvedValue({ id: 'ev-1', error: null })
})

describe('resolveProfileForLead', () => {
  it('uprednostní priradeného makléra', async () => {
    const r = await resolveProfileForLead(
      client({ lead: { assigned_profile_id: AGENT, agency_id: AGENCY } }) as never, LEAD,
    )
    expect(r.profileId).toBe(AGENT)
    expect(r.reason).toBeNull()
  })

  it('bez makléra siahne po aktívnom profile tej istej agentúry', async () => {
    // 24 aktívnych leadov nemá assigned_profile_id — bez tejto zálohy by sa
    // ich engagement stratil.
    const r = await resolveProfileForLead(
      client({
        lead: { assigned_profile_id: null, agency_id: AGENCY },
        fallback: { id: KOLEGA },
      }) as never, LEAD,
    )
    expect(r.profileId).toBe(KOLEGA)
  })

  it('bez makléra aj bez agentúry vráti dôvod, nie ticho', async () => {
    const r = await resolveProfileForLead(
      client({ lead: { assigned_profile_id: null, agency_id: null } }) as never, LEAD,
    )
    expect(r.profileId).toBeNull()
    expect(r.reason).toContain('nemá makléra ani agentúru')
  })

  it('chybu dotazu prenesie doslovne', async () => {
    const r = await resolveProfileForLead(
      client({ leadError: 'permission denied for table leads' }) as never, LEAD,
    )
    expect(r.reason).toContain('permission denied for table leads')
  })
})

describe('recordEmailEngagement', () => {
  it('otvorenie zapíše ako message_opened na leade', async () => {
    const r = await recordEmailEngagement(
      client({ lead: { assigned_profile_id: AGENT, agency_id: AGENCY } }) as never,
      { leadId: LEAD, kind: 'opened', occurredAt: '2026-09-30T20:00:00Z' },
    )

    expect(r).toEqual({ recorded: true, reason: null })
    const arg = mockLogEventDetailed.mock.calls[0][0]
    expect(arg.eventType).toBe('message_opened')
    expect(arg.entityType).toBe('lead')
    expect(arg.entityId).toBe(LEAD)
    expect(arg.profileId).toBe(AGENT)
  })

  it('klik zapíše ako message_clicked', async () => {
    await recordEmailEngagement(
      client({ lead: { assigned_profile_id: AGENT, agency_id: AGENCY } }) as never,
      { leadId: LEAD, kind: 'clicked', occurredAt: '2026-09-30T20:00:00Z' },
    )
    expect(mockLogEventDetailed.mock.calls[0][0].eventType).toBe('message_clicked')
  })

  it('podá ďalej ten istý klient — webhook nemá session', async () => {
    const c = client({ lead: { assigned_profile_id: AGENT, agency_id: AGENCY } })
    await recordEmailEngagement(c as never, {
      leadId: LEAD, kind: 'opened', occurredAt: '2026-09-30T20:00:00Z',
    })
    expect(mockLogEventDetailed.mock.calls[0][0].client).toBe(c)
  })

  it('do payloadu nedá osobné údaje', async () => {
    await recordEmailEngagement(
      client({ lead: { assigned_profile_id: AGENT, agency_id: AGENCY } }) as never,
      { leadId: LEAD, kind: 'opened', occurredAt: '2026-09-30T20:00:00Z' },
    )
    const payload = mockLogEventDetailed.mock.calls[0][0].payload
    expect(Object.keys(payload).sort()).toEqual(['channel', 'occurred_at', 'source'])
  })

  it('keď sa profil nenájde, nezapíše a povie prečo', async () => {
    const r = await recordEmailEngagement(
      client({ lead: { assigned_profile_id: null, agency_id: null } }) as never,
      { leadId: LEAD, kind: 'opened', occurredAt: '2026-09-30T20:00:00Z' },
    )
    expect(r.recorded).toBe(false)
    expect(r.reason).toContain('nemá makléra ani agentúru')
    expect(mockLogEventDetailed).not.toHaveBeenCalled()
  })

  it('zlyhanie zápisu prenesie, nezahodí', async () => {
    mockLogEventDetailed.mockResolvedValue({
      id: null,
      error: 'new row violates row-level security policy for table "events"',
    })

    const r = await recordEmailEngagement(
      client({ lead: { assigned_profile_id: AGENT, agency_id: AGENCY } }) as never,
      { leadId: LEAD, kind: 'opened', occurredAt: '2026-09-30T20:00:00Z' },
    )

    expect(r.recorded).toBe(false)
    expect(r.reason).toContain('row-level security policy')
  })
})
