// ================================================================
// GMAIL-PULL-PLAN-01 — preskočený beh musí byť vidieť, ale nesmie zaplaviť
//
// Bod 3 zadania foundera 2026-10-15: Gmail pull nebol v `vercel.json`, takže
// plánovač žil mimo repozitára a nikto nevedel, či beží. Po zaradení do
// rozvrhu (20 * * * *) vzniká nová nejednoznačnosť: prázdna `cron_runs` môže
// znamenať „Vercel to nespúšťa" aj „spúšťa a chýba konfigurácia".
//
// Zmerané 2026-10-15: ani jedna z piatich premenných, ktoré pull potrebuje
// (GMAIL_INBOUND_PULL_ENABLED, GOOGLE_GMAIL_INBOUND_CLIENT_ID / _SECRET /
// _REFRESH_TOKEN / _LABEL_ID / _AGENCY_ID), v projekte vo Verceli neexistuje —
// takže prvý stav po nasadení bude práve ten preskočený.
// ================================================================
import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SKIPPED_CRON_MIN_INTERVAL_MS, recordSkippedCronRun } from '../cron-run'

type Opts = { recent?: { id: string } | null; lookupError?: string; insertError?: string }

/** Chainable double nad `cron_runs`; `inserted` a `filters` držia, čo prišlo. */
function makeClient({ recent = null, lookupError, insertError }: Opts = {}) {
  const inserted: Record<string, unknown>[] = []
  const filters: [string, unknown][] = []
  const client = {
    from(table: string) {
      if (table !== 'cron_runs') throw new Error(`neocakavana tabulka: ${table}`)
      const builder: Record<string, unknown> = {}
      const chain = () => builder
      Object.assign(builder, {
        select: chain,
        eq: (col: string, val: unknown) => { filters.push([col, val]); return builder },
        gte: (col: string, val: unknown) => { filters.push([col, val]); return builder },
        limit: chain,
        maybeSingle: () =>
          Promise.resolve(
            lookupError
              ? { data: null, error: { message: lookupError } }
              : { data: recent, error: null },
          ),
        insert: (row: Record<string, unknown>) => {
          inserted.push(row)
          return Promise.resolve(insertError ? { error: { message: insertError } } : { error: null })
        },
      })
      return builder
    },
  } as unknown as SupabaseClient
  return { client, inserted, filters }
}

describe('recordSkippedCronRun', () => {
  it('prvý preskočený beh zapíše riadok s dôvodom', async () => {
    const { client, inserted } = makeClient()
    expect(await recordSkippedCronRun(client, 'gmail-inbound-pull', 'disabled')).toBe(true)
    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toMatchObject({
      job: 'gmail-inbound-pull',
      status: 'empty',
      detail: { skipped: 'disabled' },
      written: 0,
      failed: 0,
    })
  })

  it('druhý beh v tom istom okne už nezapisuje', async () => {
    const { client, inserted } = makeClient({ recent: { id: 'r1' } })
    expect(await recordSkippedCronRun(client, 'gmail-inbound-pull', 'disabled')).toBe(false)
    expect(inserted).toHaveLength(0)
  })

  it('strop je na dvojici job + dôvod, nie na jobe', async () => {
    // Inak by „disabled" prekrylo „missing_oauth_env" a founder by z denníka
    // nevyčítal, ktorá premenná chýba.
    const { client, filters } = makeClient()
    await recordSkippedCronRun(client, 'gmail-inbound-pull', 'missing_oauth_env')
    expect(filters).toContainEqual(['job', 'gmail-inbound-pull'])
    expect(filters).toContainEqual(['detail->>skipped', 'missing_oauth_env'])
  })

  it('okno sa dá skrátiť parametrom a predvolene je 12 hodín', async () => {
    expect(SKIPPED_CRON_MIN_INTERVAL_MS).toBe(12 * 60 * 60 * 1000)
    const { client, filters } = makeClient()
    await recordSkippedCronRun(client, 'job', 'disabled', { minIntervalMs: 1000 })
    const since = filters.find(([col]) => col === 'started_at')?.[1] as string
    expect(Date.now() - new Date(since).getTime()).toBeLessThan(5000)
  })

  it('keď sa nedá zistiť, či riadok už je, druhý sa nezapíše', async () => {
    // Nevedomosť nie je dôvod zdvojiť zápis — rovnaké pravidlo ako pri 401.
    const { client, inserted } = makeClient({ lookupError: 'db down' })
    expect(await recordSkippedCronRun(client, 'job', 'disabled')).toBe(false)
    expect(inserted).toHaveLength(0)
  })

  it('zlyhanie zápisu vráti false a nevyhodí výnimku', async () => {
    const { client } = makeClient({ insertError: 'insert zlyhal' })
    await expect(recordSkippedCronRun(client, 'job', 'disabled')).resolves.toBe(false)
  })

  it('výnimka z klienta cron nezhodí', async () => {
    const boom = { from() { throw new Error('spojenie zlyhalo') } } as unknown as SupabaseClient
    await expect(recordSkippedCronRun(boom, 'job', 'disabled')).resolves.toBe(false)
  })
})
