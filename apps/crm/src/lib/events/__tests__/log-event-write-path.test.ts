// ================================================================
// Revolis.AI — EVENTS-WRITE-PATH-01: udalosť zo servera sa musí mať čím zapísať
//
// `public.events` má za celú dobu 0 riadkov (#724). Príčina nebola RLS —
// politika `service role full access` na tabuľke existuje a je správna.
// Príčinou bolo, že `logEvent` zapisoval VŽDY cookie klientom: v cron-e
// a webhooku nie je session, `auth.uid()` je NULL, politika „users insert own
// profile events" padla a chyba skončila v `console.error`.
//
// Tieto testy držia oboje: že serverový volajúci vie podať vlastného klienta,
// a že dôvod odmietnutia sa dá prečítať namiesto holého `null`.
// ================================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateClient = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
  createAdminClient: () => mockCreateClient(),
}))

import { logEvent, logEventDetailed } from '../log-event'

const PROFILE = '44444444-4444-4444-4444-444444444444'

/** Klient, ktorý zaznamená, čo doňho pristálo. */
function spyClient(result: { data?: { id: string } | null; error?: { message: string } }) {
  const rows: Record<string, unknown>[] = []
  const client = {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        rows.push({ ...row, __table: table })
        return {
          select: () => ({
            single: () =>
              Promise.resolve({ data: result.data ?? null, error: result.error ?? null }),
          }),
        }
      },
    }),
  }
  return { client, rows }
}

const UDALOST = {
  profileId:  PROFILE,
  entityType: 'lead' as const,
  entityId:   'lead-1',
  eventType:  'lead_created' as const,
}

beforeEach(() => vi.clearAllMocks())

describe('logEvent — podaný klient', () => {
  it('zapíše cez klienta, ktorého dostane, a cookie klienta vôbec nevytvorí', async () => {
    const { client, rows } = spyClient({ data: { id: 'ev-1' } })
    mockCreateClient.mockImplementation(() => {
      throw new Error('cookie klient sa na serverovej ceste nesmie použiť')
    })

    const id = await logEvent({ ...UDALOST, client: client as never })

    expect(id).toBe('ev-1')
    expect(rows[0].__table).toBe('events')
    expect(rows[0].profile_id).toBe(PROFILE)
    expect(rows[0].event_type).toBe('lead_created')
  })

  it('bez klienta zostáva pôvodná session cesta (cookie klient)', async () => {
    const { client } = spyClient({ data: { id: 'ev-2' } })
    mockCreateClient.mockReturnValue(client)

    await expect(logEvent(UDALOST)).resolves.toBe('ev-2')
    expect(mockCreateClient).toHaveBeenCalledTimes(1)
  })
})

describe('logEventDetailed — dôvod namiesto holého null', () => {
  it('odmietnutie politikou prenesie doslovne', async () => {
    // Presne to, čo cron dostával štyri mesiace a čo zmizlo v console.error.
    const { client } = spyClient({
      error: { message: 'new row violates row-level security policy for table "events"' },
    })

    const r = await logEventDetailed({ ...UDALOST, client: client as never })

    expect(r.id).toBeNull()
    expect(r.error).toContain('row-level security policy')
  })

  it('výnimka sa nevyleje von, ale ani sa nestratí', async () => {
    const client = { from: () => { throw new Error('sieť spadla') } }

    const r = await logEventDetailed({ ...UDALOST, client: client as never })

    expect(r.id).toBeNull()
    expect(r.error).toContain('sieť spadla')
  })

  it('úspech nemá chybu', async () => {
    const { client } = spyClient({ data: { id: 'ev-3' } })
    const r = await logEventDetailed({ ...UDALOST, client: client as never })
    expect(r).toEqual({ id: 'ev-3', error: null })
  })

  it('logEvent zostáva tenkou obálkou — vracia len id', async () => {
    const { client } = spyClient({ error: { message: 'čokoľvek' } })
    await expect(logEvent({ ...UDALOST, client: client as never })).resolves.toBeNull()
  })
})
