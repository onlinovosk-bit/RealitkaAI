// ================================================================
// Revolis.AI — CRON-ALIVE: odmietnutý cron musí po sebe nechať stopu
//
// 2026-10-01 bola `cron_runs` prázdna, hoci okná 02:40 a 06:00 prešli
// s nasadeným kódom. `recompute-bri` zapisuje riadok na KAŽDEJ ceste po
// autorizácii, takže prázdna tabuľka dokazuje, že route nikto nedosiahol
// s platným CRON_SECRET. Nedokazuje ale, ČI Vercel cron vôbec prišel —
// 401 nastáva pred akýmkoľvek zápisom a runtime logy tu prežijú asi hodinu.
//
// Tieto testy držia ten rozdiel: Vercelov cron odmietnutý na autorizácii
// nechá riadok, cudzí volajúci bez hlavičky nenechá nič, a hlavička sa nedá
// použiť na zapĺňanie tabuľky (strop jeden riadok na job za hodinu).
// ================================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CRON_SCHEDULE_HEADER,
  UNAUTHORIZED_CRON_ERROR,
  recordUnauthorizedCronRun,
  vercelCronSchedule,
} from '../cron-run'

type Opts = { recent?: { id: string } | null; lookupError?: string; insertError?: string }

/** Chainable double nad `cron_runs`; `inserted` drží, čo sa reálne zapísalo. */
function makeClient({ recent = null, lookupError, insertError }: Opts = {}) {
  const inserted: Record<string, unknown>[] = []
  const client = {
    from(table: string) {
      if (table !== 'cron_runs') throw new Error(`neocakavana tabulka: ${table}`)
      const builder: Record<string, unknown> = {}
      const chain = () => builder
      Object.assign(builder, {
        select: chain, eq: chain, gte: chain, limit: chain,
        maybeSingle: () =>
          Promise.resolve(
            lookupError
              ? { data: null, error: { message: lookupError } }
              : { data: recent, error: null },
          ),
        insert: (row: Record<string, unknown>) => {
          inserted.push(row)
          return Promise.resolve(
            insertError ? { error: { message: insertError } } : { error: null },
          )
        },
      })
      return builder
    },
  } as unknown as SupabaseClient
  return { client, inserted }
}

const headers = (init: Record<string, string> = {}) => new Headers(init)

describe('vercelCronSchedule — rozlisenie Vercelovho cronu', () => {
  it('bez hlavicky nie je cron', () => {
    expect(vercelCronSchedule(headers())).toBeNull()
  })

  it('prazdna hlavicka nie je dokaz o behu', () => {
    expect(vercelCronSchedule(headers({ [CRON_SCHEDULE_HEADER]: '   ' }))).toBeNull()
  })

  it('rozvrh sa vrati orezany', () => {
    expect(vercelCronSchedule(headers({ [CRON_SCHEDULE_HEADER]: ' 40 2 * * * ' })))
      .toBe('40 2 * * *')
  })

  it('dlhy vstup sa zastropuje — rozvrh je kratky vyraz', () => {
    const long = 'x'.repeat(500)
    expect(vercelCronSchedule(headers({ [CRON_SCHEDULE_HEADER]: long }))!.length).toBe(120)
  })
})

describe('recordUnauthorizedCronRun', () => {
  beforeEach(() => vi.clearAllMocks())

  it('bez rozvrhu nezapise nic — skener tabulku nezaplna', async () => {
    const { client, inserted } = makeClient()
    expect(await recordUnauthorizedCronRun(client, 'recompute-bri', null)).toBe(false)
    expect(inserted).toHaveLength(0)
  })

  it('Vercelov cron odmietnuty na 401 necha riadok so stavom failed', async () => {
    const { client, inserted } = makeClient()
    expect(await recordUnauthorizedCronRun(client, 'recompute-bri', '40 2 * * *')).toBe(true)
    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toMatchObject({
      job: 'recompute-bri',
      status: 'failed',
      first_error: UNAUTHORIZED_CRON_ERROR,
    })
    // Rozvrh musi v riadku zostat — inak sa neda povedat, KTORE okno zlyhalo.
    expect(inserted[0].detail).toMatchObject({
      unauthorized: true,
      vercel_cron_schedule: '40 2 * * *',
    })
  })

  it('druhy pokus v tej istej hodine sa nezapise (strop)', async () => {
    const { client, inserted } = makeClient({ recent: { id: 'uz-je' } })
    expect(await recordUnauthorizedCronRun(client, 'recompute-bri', '40 2 * * *')).toBe(false)
    expect(inserted).toHaveLength(0)
  })

  it('ked sa neda zistit, ci riadok uz je, druhy sa nepise', async () => {
    const { client, inserted } = makeClient({ lookupError: 'lookup down' })
    expect(await recordUnauthorizedCronRun(client, 'recompute-bri', '40 2 * * *')).toBe(false)
    expect(inserted).toHaveLength(0)
  })

  it('zlyhanie zapisu je fail-soft — vrati false, nevyhodi', async () => {
    const { client } = makeClient({ insertError: 'insert denied' })
    await expect(recordUnauthorizedCronRun(client, 'recompute-bri', '40 2 * * *'))
      .resolves.toBe(false)
  })
})
