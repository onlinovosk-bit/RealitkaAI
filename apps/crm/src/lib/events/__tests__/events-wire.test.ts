// ================================================================
// Revolis.AI — EVENTS-WIRE-01: udalosť z prehliadača sa musí mať ako zapísať
//
// `public.events` mala 0 riadkov, hoci write-path z #724 bola správna. Príčina
// bola o vrstvu vyššie: `/api/events` brala telo ako `as { entityType, ... }`,
// pretypovanie nie je kontrola, jediný volajúci v appke posielal úplne iný
// tvar (`{ leadId, signals }`), insert padol na NOT NULL, chyba skončila
// v `console.error` a route vrátila `ok: true`. BRI preto zámerne nepočítalo
// (EVENTS-REVIVE-01) a desať tabuliek AI vrstvy zostalo prázdnych.
//
// Tieto testy držia tri veci, a každá z nich bola kedysi rozbitá:
//   1. uzavretý slovník platí ZA BEHU, nie len v type (`event_type` nemá v DB
//      CHECK, takže preklep by sa zapísal a otrávil pipeline natrvalo),
//   2. odmietnuté telo dostane 400 s dôvodom, nie tiché `ok: true`,
//   3. zlyhaný zápis dostane 500, nie `ok: true` nad neexistujúcim riadkom.
// ================================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ENTITY_TYPES, EVENT_TYPES } from '@/types/events'
import type { EntityType, EventType } from '@/types/events'

const PROFILE = '55555555-5555-5555-5555-555555555555'
const LEAD = '66666666-6666-6666-6666-666666666666'

const mockLogEventDetailed = vi.fn()
const mockRecomputeBRI = vi.fn()
const mockCheckIntegrity = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getUser: () => Promise.resolve({ data: { user: { id: 'auth-1' } } }) },
      from: () => ({
        select: () => ({
          eq: () => ({ single: () => Promise.resolve({ data: { id: PROFILE } }) }),
        }),
      }),
    }),
  createAdminClient: () => ({}),
}))

vi.mock('@/lib/events/log-event', () => ({
  logEventDetailed: (opts: unknown) => mockLogEventDetailed(opts),
}))

vi.mock('@/lib/events/bri-score', () => ({
  recomputeBRI: (...args: unknown[]) => mockRecomputeBRI(...args),
}))

vi.mock('@/lib/events/integrity-monitor', () => ({
  checkIntegrity: (...args: unknown[]) => mockCheckIntegrity(...args),
}))

import { POST } from '@/app/api/events/route'

function post(body: unknown): Request {
  return new Request('http://localhost/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = (body: unknown) => POST(post(body) as any)

beforeEach(() => {
  vi.clearAllMocks()
  mockLogEventDetailed.mockResolvedValue({ id: 'event-1', error: null })
  mockRecomputeBRI.mockResolvedValue(undefined)
  mockCheckIntegrity.mockResolvedValue(undefined)
})

describe('slovník typov je jeden zdroj pre runtime aj pre typ', () => {
  it('runtime polia nie sú prázdne a sú bez duplikátov', () => {
    expect(ENTITY_TYPES.length).toBeGreaterThan(0)
    expect(EVENT_TYPES.length).toBeGreaterThan(0)
    expect(new Set(ENTITY_TYPES).size).toBe(ENTITY_TYPES.length)
    expect(new Set(EVENT_TYPES).size).toBe(EVENT_TYPES.length)
  })

  it('typ je derivovaný z poľa, takže sa nemôžu rozísť', () => {
    // Keby `EventType` prestal byť `(typeof EVENT_TYPES)[number]`, toto
    // priradenie prestane typovať a CI to zachytí.
    const entity: EntityType = ENTITY_TYPES[0]
    const event: EventType = EVENT_TYPES[0]
    expect(ENTITY_TYPES).toContain(entity)
    expect(EVENT_TYPES).toContain(event)
  })

  it('nesie typy, na ktorých visí BRI trigger a kontaktný pokus', () => {
    // Odstránenie čohokoľvek z tohto zoznamu odpojí signál, ktorý niečo volá.
    for (const t of [
      'lead_viewed', 'call_completed', 'property_viewed',
      'message_opened', 'message_replied',
      'call_initiated', 'message_initiated',
    ]) {
      expect(EVENT_TYPES).toContain(t)
    }
  })
})

describe('POST /api/events — telo sa validuje, nepretypováva', () => {
  it('zapíše event a vráti jeho id pri platnom tele', async () => {
    const res = await call({ entityType: 'lead', entityId: LEAD, eventType: 'lead_viewed' })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ ok: true, event_id: 'event-1' })
    expect(mockLogEventDetailed).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: PROFILE,
        entityType: 'lead',
        entityId: LEAD,
        eventType: 'lead_viewed',
      }),
    )
  })

  it.each([
    ['tvar, ktorý posielalo pôvodné demo tlačidlo', { leadId: LEAD, signals: { email_open: 1 } }],
    ['chýbajúci eventType', { entityType: 'lead', entityId: LEAD }],
    ['chýbajúci entityType', { eventType: 'lead_viewed', entityId: LEAD }],
    ['neznámy eventType (preklep)', { entityType: 'lead', eventType: 'lead_vieweed' }],
    ['neznámy entityType', { entityType: 'leadd', eventType: 'lead_viewed' }],
    ['prázdny objekt', {}],
  ])('odmietne 400 bez zápisu: %s', async (_label, body) => {
    const res = await call(body)
    expect(res.status).toBe(400)
    expect(mockLogEventDetailed).not.toHaveBeenCalled()
  })

  it('odmietne nevalidný JSON s 400 a bez zápisu', async () => {
    const res = await call('{ nie json')
    expect(res.status).toBe(400)
    expect(mockLogEventDetailed).not.toHaveBeenCalled()
  })

  it('zlyhaný zápis je 500, nikdy ok:true nad neexistujúcim riadkom', async () => {
    mockLogEventDetailed.mockResolvedValue({ id: null, error: 'new row violates RLS' })
    const res = await call({ entityType: 'lead', entityId: LEAD, eventType: 'lead_viewed' })
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: 'new row violates RLS' })
  })

  it('zápis bez id je tiež 500, aj keď chyba nepríde', async () => {
    mockLogEventDetailed.mockResolvedValue({ id: null, error: null })
    const res = await call({ entityType: 'lead', entityId: LEAD, eventType: 'lead_viewed' })
    expect(res.status).toBe(500)
  })

  it('pri zlyhanom zápise sa BRI neprepočítava — nebolo z čoho', async () => {
    mockLogEventDetailed.mockResolvedValue({ id: null, error: 'boom' })
    await call({ entityType: 'lead', entityId: LEAD, eventType: 'lead_viewed' })
    expect(mockRecomputeBRI).not.toHaveBeenCalled()
  })
})

describe('POST /api/events — následky zostávajú zapojené', () => {
  it('lead_viewed spustí prepočet BRI pre ten lead', async () => {
    await call({ entityType: 'lead', entityId: LEAD, eventType: 'lead_viewed' })
    expect(mockRecomputeBRI).toHaveBeenCalledWith(LEAD, PROFILE)
  })

  it('event bez entityId BRI nespustí — nie je čo počítať', async () => {
    await call({ entityType: 'system', eventType: 'lead_viewed' })
    expect(mockRecomputeBRI).not.toHaveBeenCalled()
  })

  it('export_contacts spustí kontrolu integrity s počtom z payloadu', async () => {
    await call({
      entityType: 'export',
      eventType: 'export_contacts',
      payload: { count: 42 },
    })
    // Poradie je (profileId, authUserId, …) — tak to route volá.
    expect(mockCheckIntegrity).toHaveBeenCalledWith(PROFILE, 'auth-1', 'export_contacts', 42)
  })
})
