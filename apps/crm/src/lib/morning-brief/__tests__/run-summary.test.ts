// ================================================================
// Revolis.AI — beh ranného briefu musí po sebe nechať rozlíšiteľnú stopu
//
// BRIEF-CRON-OBSERVE-01. Cron vracal `{ sent: 0, failed: 0 }` rovnako pri
// „brief nemá nikto zapnutý" ako pri „všetkým zlyhalo doručenie". A meranie
// z MORNING-BRIEF-DECIDE-01 pridalo tretí stav, ktorý sa z toho istého čísla
// nedal prečítať: `morning_brief_settings` má 0 riadkov, lebo komponent
// BriefSettings.tsx sa nikde nevykresľuje — brief sa fyzicky nedá zapnúť.
// ================================================================
import { describe, expect, it } from 'vitest'

import {
  briefNobodyEnabledReason,
  summariseBriefDeliveries,
  type BriefDeliveryResult,
} from '../run-summary'
import { deriveCronStatus } from '@/lib/ops/cron-run'

const ok = (id: string): BriefDeliveryResult =>
  ({ profileId: id, delivered: true, channels: ['email'] })

const zle = (id: string, error?: string): BriefDeliveryResult =>
  ({ profileId: id, delivered: false, channels: [], error })

describe('summariseBriefDeliveries', () => {
  it('spočíta doručené aj nedoručené zvlášť', () => {
    const s = summariseBriefDeliveries([ok('p1'), zle('p2', 'resend: 429'), ok('p3')])
    expect(s.written).toBe(2)
    expect(s.failed).toBe(1)
  })

  it('podrží prvú chybu doslovne', () => {
    const s = summariseBriefDeliveries([
      zle('p1', 'resend: domain not verified'),
      zle('p2', 'iná chyba'),
    ])
    expect(s.firstError).toBe('resend: domain not verified')
  })

  it('zlyhanie bez chybovej hlášky sa nesmie stratiť', () => {
    // Profil bez e-mailu vráti delivered: false a žiadny error. Pred touto
    // zmenou by v denníku zostalo `failed: 1, firstError: null` — počet bez
    // dôvodu, teda to isté ticho v menšom.
    const s = summariseBriefDeliveries([zle('p9')])
    expect(s.failed).toBe(1)
    expect(s.firstError).toContain('p9')
  })

  it('samé úspechy nechajú firstError prázdny', () => {
    const s = summariseBriefDeliveries([ok('p1'), ok('p2')])
    expect(s).toEqual({ written: 2, failed: 0, firstError: null })
  })
})

describe('briefNobodyEnabledReason', () => {
  it('rozlíši „nastavenia neexistujú" od „sú vypnuté"', () => {
    const ziadne = briefNobodyEnabledReason(0)
    const vypnute = briefNobodyEnabledReason(7)

    expect(ziadne).toContain('0 riadkov')
    expect(ziadne).toContain('BriefSettings.tsx')
    expect(vypnute).toContain('7 riadkov')
    expect(vypnute).toContain('voľbou')
    expect(ziadne).not.toBe(vypnute)
  })
})

describe('stav behu briefu', () => {
  it('nikto zapnutý = empty, nie failed', () => {
    // Žiadny adresát nie je porucha. Červený cron by tu klamal rovnako ako
    // predtým zelený.
    expect(deriveCronStatus(0, 0, 0)).toBe('empty')
  })

  it('mal komu poslať a neposlal nikomu = failed', () => {
    expect(deriveCronStatus(3, 0, 3)).toBe('failed')
  })

  it('časť neodišla = partial', () => {
    expect(deriveCronStatus(3, 2, 1)).toBe('partial')
  })
})
