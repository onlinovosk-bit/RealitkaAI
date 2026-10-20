import { describe, it, expect } from 'vitest'
import { deriveCronStatus } from '@/lib/ops/cron-run'

/**
 * CRON-TRUTH-01 — `cron_runs` je jediná stopa po behu cronu, ktorá prežije
 * hodinu (runtime logy Vercelu nie). Keď klame, nemá to kto chytiť.
 *
 * Zmerané 2026-10-19 v PROD za 14 dní: 51 behov, 1 `ok`. Z toho `follow-up-sweep`
 * 3× `failed` s detailom `{"planned": 0, "cooldown_days": 7}` — cooldown vyradil
 * kandidátov, čiže beh urobil presne to, čo mal. Zároveň mal `recompute-bri`
 * 3 SKUTOČNÉ pády (`compute_bri_score`: no unique constraint matching ON CONFLICT)
 * a v tej záplave falošných červených sa stratili.
 */
describe('deriveCronStatus — červená len vtedy, keď sa naozaj niečo pokazilo', () => {
  it('nič na vstupe → empty', () => {
    expect(deriveCronStatus(0, 0, 0)).toBe('empty')
  })

  it('REGRESIA: zvážené, nič netreba, nič nepadlo → empty, NIE failed', () => {
    // Presne prípad follow-up-sweep z PROD: kandidáti boli, plán žiadny,
    // chyba žiadna. Pred CRON-TRUTH-01 to vracalo 'failed'.
    expect(deriveCronStatus(24, 0, 0)).toBe('empty')
    expect(deriveCronStatus(1, 0, 0)).toBe('empty')
  })

  it('skúsilo sa a všetko padlo → failed', () => {
    expect(deriveCronStatus(26, 0, 26)).toBe('failed')
    expect(deriveCronStatus(3, 0, 1)).toBe('failed')
  })

  it('časť prešla, časť padla → partial', () => {
    expect(deriveCronStatus(26, 20, 6)).toBe('partial')
  })

  it('všetko prešlo → ok', () => {
    expect(deriveCronStatus(26, 26, 0)).toBe('ok')
  })

  it('vracia iba hodnoty, ktoré povolí CHECK na cron_runs.status', () => {
    // PROD: CHECK (status = ANY (ARRAY['ok','empty','partial','failed'])).
    // Nový stav by znamenal migráciu — preto sa sem žiadny nesmie prepašovať.
    const povolene = ['ok', 'empty', 'partial', 'failed']
    const vzorky: Array<[number, number, number]> = [
      [0, 0, 0], [24, 0, 0], [26, 0, 26], [26, 20, 6], [26, 26, 0], [5, 3, 0], [5, 0, 2],
    ]
    for (const [e, w, f] of vzorky) {
      expect(povolene).toContain(deriveCronStatus(e, w, f))
    }
  })
})
