// ================================================================
// Revolis.AI — beh cronu musí po sebe nechať stopu (BRI-CRON-OBSERVE-01)
//
// 2026-09-30 o 02:40 bežal /api/cron/recompute-bri prvýkrát naostro. Do
// `lead_scores` nepribudlo nič a o 07:50 sa už nedalo zistiť prečo: logy
// Vercelu tu prežijú asi hodinu a batch vracal jedno číslo, do ktorého sa
// „profil nemá leady" aj „všetkých 26 RPC zlyhalo" premietli rovnako — ako 0.
//
// Tieto testy držia oba rozdiely: zlyhania sa počítajú zvlášť a prvá chyba
// prežije doslovne.
// ================================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateClient = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
  createAdminClient: () => mockCreateClient(),
}))

import { batchRecomputeBRI } from '../bri-score'
import { deriveCronStatus, recordCronRun } from '@/lib/ops/cron-run'

const PROFILE = '33333333-3333-3333-3333-333333333333'

interface Options {
  leads?:      { id: string }[]
  leadsError?: string
  rpcError?:   string
}

/** Chainable double; odpovedá podľa tabuľky, nie podľa poradia volaní. */
function makeClient({ leads = [], leadsError, rpcError }: Options) {
  const client = {
    from(table: string) {
      const resolve = () => {
        if (table === 'leads') {
          return leadsError
            ? { data: null, error: { message: leadsError } }
            : { data: leads, error: null }
        }
        if (table === 'lead_scores') return { data: { bri_score: 0 }, error: null }
        return { data: null, error: null }
      }
      const builder: Record<string, unknown> = {}
      const chain = () => builder
      Object.assign(builder, {
        select: chain, order: chain, limit: chain, in: chain, gte: chain,
        eq: chain, neq: chain,
        single: () => Promise.resolve(resolve()),
        then: (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) =>
          Promise.resolve(resolve()).then(ok, err),
      })
      return builder
    },
    rpc: () =>
      Promise.resolve(
        rpcError ? { data: null, error: { message: rpcError } } : { data: 61, error: null },
      ),
  }
  return client
}

describe('batchRecomputeBRI — zlyhania sa nesmú stratiť', () => {
  beforeEach(() => vi.clearAllMocks())

  it('odlíši „nemá leady" od „všetko zlyhalo"', async () => {
    mockCreateClient.mockReturnValue(makeClient({ leads: [] }))
    const prazdny = await batchRecomputeBRI(PROFILE)

    mockCreateClient.mockReturnValue(
      makeClient({ leads: [{ id: 'l1' }, { id: 'l2' }], rpcError: 'permission denied for function compute_bri_score' }),
    )
    const zlyhany = await batchRecomputeBRI(PROFILE)

    // Pred touto zmenou obe vetvy vrátili to isté: 0.
    expect(prazdny.leads).toBe(0)
    expect(prazdny.failed).toBe(0)

    expect(zlyhany.leads).toBe(2)
    expect(zlyhany.computed).toBe(0)
    expect(zlyhany.failed).toBe(2)
  })

  it('prenesie prvú chybu doslovne, nie ako „niečo zlyhalo"', async () => {
    mockCreateClient.mockReturnValue(
      makeClient({ leads: [{ id: 'l1' }], rpcError: 'permission denied for function compute_bri_score' }),
    )
    const r = await batchRecomputeBRI(PROFILE)
    expect(r.firstError).toContain('permission denied for function compute_bri_score')
  })

  it('nahlási zlyhaný dotaz na leady ako chybu, nie ako prázdny profil', async () => {
    mockCreateClient.mockReturnValue(makeClient({ leadsError: 'column leads.foo does not exist' }))
    const r = await batchRecomputeBRI(PROFILE)
    expect(r.leads).toBe(0)
    expect(r.firstError).toContain('column leads.foo does not exist')
  })
})

describe('deriveCronStatus', () => {
  it('pomenuje štyri stavy jednotne', () => {
    expect(deriveCronStatus(0,  0, 0)).toBe('empty')    // nebolo čo počítať
    expect(deriveCronStatus(26, 0, 26)).toBe('failed')  // mal čo, nezapísal nič
    expect(deriveCronStatus(26, 20, 6)).toBe('partial')
    expect(deriveCronStatus(26, 26, 0)).toBe('ok')
  })
})

describe('recordCronRun', () => {
  function insertSpy(error?: { message: string }) {
    const rows: Record<string, unknown>[] = []
    const client = {
      from: () => ({
        insert: (row: Record<string, unknown>) => {
          rows.push(row)
          return Promise.resolve({ error: error ?? null })
        },
      }),
    }
    return { client, rows }
  }

  it('uloží čísla aj prvú chybu', async () => {
    const { client, rows } = insertSpy()
    const err = await recordCronRun(client as never, {
      job: 'recompute-bri', status: 'partial',
      scanned: 19, eligible: 493, written: 400, failed: 93,
      firstError: 'rpc compute_bri_score: timeout',
    })

    expect(err).toBeNull()
    expect(rows[0]).toMatchObject({
      job: 'recompute-bri', status: 'partial',
      scanned: 19, eligible: 493, written: 400, failed: 93,
    })
    expect(rows[0].first_error).toBe('rpc compute_bri_score: timeout')
  })

  it('odstráni NUL bajt, ktorý by Postgres odmietol', async () => {
    const { client, rows } = insertSpy()
    await recordCronRun(client as never, {
      job: 'x', status: 'failed', firstError: 'zly\u0000znak',
    })
    expect(rows[0].first_error).toBe('zlyznak')
  })

  it('vráti chybu zápisu namiesto toho, aby ju zahodila', async () => {
    const { client } = insertSpy({ message: 'relation "cron_runs" does not exist' })
    const err = await recordCronRun(client as never, { job: 'x', status: 'ok' })
    expect(err).toContain('relation "cron_runs" does not exist')
  })

  it('neprepadne výnimkou — cron nesmie spadnúť na logovaní', async () => {
    const client = { from: () => { throw new Error('sieť spadla') } }
    await expect(
      recordCronRun(client as never, { job: 'x', status: 'ok' }),
    ).resolves.toContain('sieť spadla')
  })
})
