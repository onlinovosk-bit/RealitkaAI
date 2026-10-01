// ================================================================
// Revolis.AI — BRI beží len vtedy, keď filtruje na stĺpce, ktoré existujú
//
// Regresná poistka pre BRI-DEAD-PATH (#738). `lead_scores` aj
// `bri_score_history` mali za celú dobu 0 riadkov, hoci RPC v produkcii
// funguje. Dôvodom bola séria filtrov na neexistujúce stĺpce a hodnoty —
// a supabase-js vracia `{ data: null, error }`, takže každý z nich sa
// premenil na tiché `return 0`.
//
// Skutočná schéma (overená v PROD 2026-09-29):
//   leads:    assigned_profile_id, is_active, name
//             status ∈ Horúci | Nový | Obhliadka | Ponuka | Uzavretý
//   profiles: is_active   (žiadny account_status)
//
// Každý test nižšie padá proti implementácii, ktorá tu bola predtým.
// ================================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateClient = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
  createAdminClient: () => mockCreateClient(),
}))

import { batchRecomputeBRI } from '../bri-score'

const PROFILE = '22222222-2222-2222-2222-222222222222'

interface Recorded {
  table: string
  columns: string
  eq: Record<string, unknown>
  neq: Record<string, unknown>
}

/**
 * Chainable Supabase double. Odpovedá podľa tvaru dotazu, nie podľa poradia
 * volaní, takže testy prežijú preusporiadanie vnútri funkcie.
 */
function makeClient(leads: { id: string }[]) {
  const recorded: Recorded[] = []

  const client = {
    from(table: string) {
      const entry: Recorded = { table, columns: '', eq: {}, neq: {} }
      recorded.push(entry)

      const resolve = () => {
        if (table === 'leads') return { data: leads, error: null }
        if (table === 'lead_scores') return { data: { bri_score: 0 }, error: null }
        return { data: null, error: null }
      }

      const builder: Record<string, unknown> = {}
      const chain = () => builder
      Object.assign(builder, {
        select: (cols?: unknown) => {
          if (typeof cols === 'string') entry.columns = cols
          return builder
        },
        order: chain,
        limit: chain,
        in: chain,
        gte: chain,
        eq: (col: string, val: unknown) => {
          entry.eq[col] = val
          return builder
        },
        neq: (col: string, val: unknown) => {
          entry.neq[col] = val
          return builder
        },
        single: () => Promise.resolve(resolve()),
        then: (onOk: (v: unknown) => unknown, onErr?: (e: unknown) => unknown) =>
          Promise.resolve(resolve()).then(onOk, onErr),
      })
      return builder
    },
    rpc: () => Promise.resolve({ data: 42, error: null }),
  }

  return { client, recorded }
}

const leadsQuery = (recorded: Recorded[]) =>
  recorded.find((r) => r.table === 'leads')

describe('batchRecomputeBRI — filtre na skutočné stĺpce', () => {
  beforeEach(() => vi.clearAllMocks())

  it('nikdy nefiltruje leads na neexistujúci profile_id', async () => {
    const { client, recorded } = makeClient([])
    mockCreateClient.mockReturnValue(client)

    await batchRecomputeBRI(PROFILE)

    const q = leadsQuery(recorded)
    expect(q, 'žiadny dotaz na leads sa nevykonal').toBeDefined()
    expect(q?.eq).not.toHaveProperty('profile_id')
  })

  it('scopuje leady cez assigned_profile_id', async () => {
    const { client, recorded } = makeClient([])
    mockCreateClient.mockReturnValue(client)

    await batchRecomputeBRI(PROFILE)

    expect(leadsQuery(recorded)?.eq['assigned_profile_id']).toBe(PROFILE)
  })

  it('nefiltruje na status "active", ktorý v dátach neexistuje', async () => {
    const { client, recorded } = makeClient([])
    mockCreateClient.mockReturnValue(client)

    await batchRecomputeBRI(PROFILE)

    // Pôvodné .eq('status','active') nematchovalo ani jeden z 512 aktívnych
    // leadov, lebo reálne statusy sú slovenské.
    expect(leadsQuery(recorded)?.eq['status']).toBeUndefined()
  })

  it('berie aktívne leady a vylučuje uzavreté', async () => {
    const { client, recorded } = makeClient([])
    mockCreateClient.mockReturnValue(client)

    await batchRecomputeBRI(PROFILE)

    const q = leadsQuery(recorded)
    expect(q?.eq['is_active']).toBe(true)
    expect(q?.neq['status']).toBe('Uzavretý')
  })

  it('spočíta prepočítané leady, keď dotaz naozaj niečo vráti', async () => {
    const { client } = makeClient([{ id: 'l1' }, { id: 'l2' }, { id: 'l3' }])
    mockCreateClient.mockReturnValue(client)

    const result = await batchRecomputeBRI(PROFILE)

    // Na starom kóde by dotaz zlyhal na neexistujúcom stĺpci a vrátilo by sa 0.
    expect(result.computed).toBe(3)
    expect(result.leads).toBe(3)
    expect(result.failed).toBe(0)
    expect(result.firstError).toBeNull()
  })

  it('prijme klienta zvonku, aby cron mohol podať service-role', async () => {
    const { client, recorded } = makeClient([])
    mockCreateClient.mockImplementation(() => {
      throw new Error('cookie klient sa v cron-e nesmie použiť')
    })

    await batchRecomputeBRI(PROFILE, client as never)

    expect(leadsQuery(recorded)).toBeDefined()
  })
})
