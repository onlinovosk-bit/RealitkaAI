// ================================================================
// Revolis.AI — CRON-ALIVE: odmietnutý cron musí po sebe nechať stopu
//
// 2026-10-01 bola `cron_runs` prázdna, hoci okná 02:40 a 06:00 prešli
// s nasadeným kódom. `recompute-bri` zapisuje riadok na KAŽDEJ ceste po
// autorizácii, takže prázdna tabuľka dokazuje, že route nikto nedosiahol
// s platným CRON_SECRET. Nedokazuje ale, ČI Vercel cron vôbec prišel —
// 401 nastáva pred akýmkoľvek zápisom a runtime logy tu prežijú asi hodinu.
//
// Hlavička `x-vercel-cron-schedule` je ROZLIŠOVAČ, nie dôkaz: poslať ju vie
// ktokoľvek. Preto:
//   • neplatný cron výraz = žiadny zápis a ani jeden dotaz do DB,
//   • strop je na (job, rozvrh), takže vymyslená hlavička nemôže obsadiť slot
//     skutočného rozvrhu — to bola chyba prvej verzie, našiel ju review,
//   • `user_agent` ide do riadku ako auditná stopa (Vercel: `vercel-cron/…`).
// ================================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CRON_SCHEDULE_HEADER,
  UNAUTHORIZED_CRON_ERROR,
  callerUserAgent,
  recordUnauthorizedCronRun,
  vercelCronSchedule,
} from '../cron-run'

type Opts = { recent?: { id: string } | null; lookupError?: string; insertError?: string }

/** Chainable double nad `cron_runs`; `inserted` a `filters` držia, čo prišlo. */
function makeClient({ recent = null, lookupError, insertError }: Opts = {}) {
  const inserted: Record<string, unknown>[] = []
  const filters: [string, unknown][] = []
  let lookups = 0
  const client = {
    from(table: string) {
      if (table !== 'cron_runs') throw new Error(`neocakavana tabulka: ${table}`)
      const builder: Record<string, unknown> = {}
      const chain = () => builder
      Object.assign(builder, {
        select: () => { lookups += 1; return builder },
        eq: (col: string, val: unknown) => { filters.push([col, val]); return builder },
        gte: chain, limit: chain,
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
  return { client, inserted, filters, lookupCount: () => lookups }
}

const headers = (init: Record<string, string> = {}) => new Headers(init)

describe('vercelCronSchedule — rozlisovac, nie dokaz', () => {
  it('bez hlavicky nie je cron', () => {
    expect(vercelCronSchedule(headers())).toBeNull()
  })

  it('prazdna hlavicka nie je rozvrh', () => {
    expect(vercelCronSchedule(headers({ [CRON_SCHEDULE_HEADER]: '   ' }))).toBeNull()
  })

  it('platny 5-polovy vyraz sa vrati normalizovany', () => {
    expect(vercelCronSchedule(headers({ [CRON_SCHEDULE_HEADER]: ' 40  2 * * * ' })))
      .toBe('40 2 * * *')
  })

  // Toto je ten rozdiel oproti prvej verzii: nahodny retazec sa zahodi uz tu,
  // takze neautentifikovany volajuci nekupi ani jedno citanie DB (nalez 2).
  it.each([
    ['prilis malo poli', '40 2 * *'],
    ['prilis vela poli', '40 2 * * * *'],
    ['nepovoleny znak', '40 2 * * ;DROP'],
    ['prazdny retazec po trimme', ' '],
    ['dlhy vstup', 'x'.repeat(200)],
  ])('%s nie je rozvrh', (_label, value) => {
    expect(vercelCronSchedule(headers({ [CRON_SCHEDULE_HEADER]: value }))).toBeNull()
  })
})

describe('callerUserAgent', () => {
  it('vrati orezany user agent', () => {
    expect(callerUserAgent(headers({ 'user-agent': ' vercel-cron/1.0 ' }))).toBe('vercel-cron/1.0')
  })
  it('bez hlavicky vrati null', () => {
    expect(callerUserAgent(headers())).toBeNull()
  })
  it('dlhy user agent zastropuje', () => {
    expect(callerUserAgent(headers({ 'user-agent': 'u'.repeat(500) }))!.length).toBe(200)
  })
})

describe('recordUnauthorizedCronRun', () => {
  beforeEach(() => vi.clearAllMocks())

  it('bez rozvrhu nezapise nic a nerobi ani dotaz do DB', async () => {
    const { client, inserted, lookupCount } = makeClient()
    expect(await recordUnauthorizedCronRun(client, 'recompute-bri', null)).toBe(false)
    expect(inserted).toHaveLength(0)
    expect(lookupCount()).toBe(0)
  })

  it('odmietnuta poziadavka s rozvrhom necha riadok so stavom failed', async () => {
    const { client, inserted } = makeClient()
    expect(
      await recordUnauthorizedCronRun(client, 'recompute-bri', '40 2 * * *', 'vercel-cron/1.0'),
    ).toBe(true)
    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toMatchObject({
      job: 'recompute-bri',
      status: 'failed',
      first_error: UNAUTHORIZED_CRON_ERROR,
    })
    // Rozvrh aj user agent musia v riadku zostat — bez nich sa neda posudit,
    // ci riadok naozaj pochadza z Vercelu a ktore okno zlyhalo.
    expect(inserted[0].detail).toMatchObject({
      unauthorized: true,
      vercel_cron_schedule: '40 2 * * *',
      user_agent: 'vercel-cron/1.0',
    })
  })

  it('bez user agenta sa riadok zapise s null, nie bez pola', async () => {
    const { client, inserted } = makeClient()
    await recordUnauthorizedCronRun(client, 'recompute-bri', '40 2 * * *')
    expect((inserted[0].detail as Record<string, unknown>).user_agent).toBeNull()
  })

  // Jadro naleznu z review: strop sa kluci na (job, rozvrh). Keby bol len na
  // job, vymyslena hlavicka obsadi slot a skutocne odmietnutie Vercelu sa
  // v tej hodine nezapise — strop proti zneuzitiu by vyrabal stratu dokazu.
  it('strop sa pyta na kombinaciu job + rozvrh', async () => {
    const { client, filters } = makeClient()
    await recordUnauthorizedCronRun(client, 'recompute-bri', '40 2 * * *')
    expect(filters).toContainEqual(['job', 'recompute-bri'])
    expect(filters).toContainEqual(['detail->>vercel_cron_schedule', '40 2 * * *'])
  })

  it('druhy pokus s tym istym rozvrhom v tej istej hodine sa nezapise', async () => {
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
