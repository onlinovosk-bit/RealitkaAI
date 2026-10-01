// ================================================================
// Revolis.AI — EVENTS-REVIVE-01: BRI nesmie vyrobiť číslo, ktoré nemá z čoho
//
// Meranie PROD 2026-09-30: `events` 0 riadkov. Z 19 tabuliek s `lead_id` má
// najlepšie pokrytie `decisions` (48 z 514 aktívnych leadov, posledný jún)
// a `tasks` (41, z toho 11 čerstvých). `activities` má lead_id len na 4 zo
// 191 riadkov, takže pôvodné odporúčanie „prepočítať BRI z activities"
// neobstálo — signál neexistuje nikde.
//
// Bez eventov dá RPC každému leadu 12/100 a strop je 22, pričom horúci lead
// začína na 60. Tieto testy držia, že sa taký zápis nestane a že „nevieme"
// sa neprepadne do „nie je".
// ================================================================
import { describe, expect, it } from 'vitest'

import {
  BRI_CEILING_WITHOUT_EVENTS,
  BRI_HOT_THRESHOLD,
  checkEngagementSignal,
  engagementMissingReason,
} from '../engagement-signal'

function client(result: { count?: number | null; error?: { message: string } }) {
  return {
    from: () => ({
      select: () => Promise.resolve({ count: result.count ?? null, error: result.error ?? null }),
    }),
  }
}

describe('checkEngagementSignal', () => {
  it('prázdna tabuľka events = signál chýba', async () => {
    const s = await checkEngagementSignal(client({ count: 0 }) as never)
    expect(s.present).toBe(false)
    expect(s.eventRows).toBe(0)
    expect(s.error).toBeNull()
  })

  it('aspoň jeden riadok = signál je', async () => {
    const s = await checkEngagementSignal(client({ count: 1 }) as never)
    expect(s.present).toBe(true)
    expect(s.eventRows).toBe(1)
  })

  it('chyba dotazu sa NEsmie tváriť ako „signál chýba"', async () => {
    const s = await checkEngagementSignal(
      client({ error: { message: 'permission denied for table events' } }) as never,
    )
    // present je false, ale error je vyplnený — volajúci musí oboje rozlíšiť
    // a vrátiť 500, nie ticho preskočiť beh.
    expect(s.present).toBe(false)
    expect(s.error).toContain('permission denied for table events')
  })

  it('count null (PostgREST bez hlavičky) neznamená, že riadky sú', async () => {
    const s = await checkEngagementSignal(client({ count: null }) as never)
    expect(s.present).toBe(false)
    expect(s.eventRows).toBe(0)
  })
})

describe('aritmetika, kvôli ktorej sa zápis vynecháva', () => {
  it('strop bez eventov je pod prahom horúceho leadu', () => {
    // 0·0,30 + 0·0,25 + 90·0,20 + 0·0,15 + 40·0,10 = 22
    expect(BRI_CEILING_WITHOUT_EVENTS).toBe(22)
    expect(BRI_CEILING_WITHOUT_EVENTS).toBeLessThan(BRI_HOT_THRESHOLD)
  })

  it('dôvod v denníku nesie čísla, nie len „chýbajú dáta"', () => {
    const r = engagementMissingReason()
    expect(r).toContain('0 riadkov')
    expect(r).toContain('12/100')
    expect(r).toContain(String(BRI_CEILING_WITHOUT_EVENTS))
    expect(r).toContain(String(BRI_HOT_THRESHOLD))
  })
})
