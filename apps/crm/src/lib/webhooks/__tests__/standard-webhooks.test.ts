// ================================================================
// Revolis.AI — overenie podpisu Resend webhooku
//
// Kľúčový test je FIXTURE nižšie: podpis nie je spočítaný tou istou funkciou,
// ktorú testujeme, ale skutočnou knižnicou `standardwebhooks` (tou, ktorou
// Resend cez Svix podpisuje). Vygenerovaný raz a zamrznutý, aby test
// nezávisel na tranzitívnej závislosti v `node_modules`.
//
// Bez takého vektora by test iba zopakoval tú istú (možno chybnú) matematiku
// ako produkčný kód — a presne to sa stalo pôvodnej verzii endpointu:
// porovnávala hex HMAC nad telom, čo sa Svix podpisu nemôže rovnať nikdy.
// Posledný test to pinuje: stará schéma musí byť odmietnutá.
// ================================================================
import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  WEBHOOK_TOLERANCE_SECONDS,
  signStandardWebhook,
  verifyStandardWebhook,
} from '../standard-webhooks'

// Vygenerované knižnicou `standardwebhooks` (v1.90.0 balíka `svix`):
//   new Webhook(SECRET).sign(ID, new Date(TS * 1000), BODY)
const SECRET = 'whsec_cmV2b2xpcy10ZXN0LWtleS0wMTIzNDU2Nzg5'
const ID     = 'msg_2abcDEF'
const TS     = 1790000000
const BODY   =
  '{"type":"email.opened","created_at":"2026-09-30T20:00:00.000Z","data":{"tags":{"lead_id":"lead-123"}}}'
const SIG    = 'v1,stYIoA117E4pVMqsBP4UyYGQSJv7U3Lz4lzkNoxxtow='

function verify(over: Partial<Parameters<typeof verifyStandardWebhook>[0]> = {}) {
  return verifyStandardWebhook({
    secret: SECRET,
    id: ID,
    timestamp: String(TS),
    signatureHeader: SIG,
    body: BODY,
    nowSeconds: TS,
    ...over,
  })
}

describe('signStandardWebhook', () => {
  it('reprodukuje podpis skutočnej Svix knižnice', () => {
    // Toto je dôkaz, že schéma je správna: base64 kľúč z `whsec_`,
    // podpisuje sa `id.timestamp.telo`, výstup `v1,<base64>`.
    expect(signStandardWebhook(SECRET, ID, TS, BODY)).toBe(SIG)
  })

  it('tajomstvo bez prefixu `whsec_` dá ten istý podpis', () => {
    expect(signStandardWebhook(SECRET.slice('whsec_'.length), ID, TS, BODY)).toBe(SIG)
  })
})

describe('verifyStandardWebhook', () => {
  it('prijme skutočnú doručenku', () => {
    expect(verify()).toEqual({ valid: true, reason: null })
  })

  it('prijme, keď hlavička nesie viac podpisov (rotácia kľúča)', () => {
    // Svix počas prekryvu kľúčov posiela podpisy oddelené medzerou.
    const r = verify({ signatureHeader: `v1,bXlzdGVyeQ== ${SIG}` })
    expect(r.valid).toBe(true)
  })

  it('preskočí neznámu verziu podpisu', () => {
    const r = verify({ signatureHeader: `v2,${SIG.slice(3)} ${SIG}` })
    expect(r.valid).toBe(true)
  })

  it('odmietne iné tajomstvo', () => {
    const r = verify({ secret: 'whsec_aW5lLXRham9tc3R2bw==' })
    expect(r.valid).toBe(false)
    expect(r.reason).toContain('nesedí')
  })

  it('odmietne zmenené telo', () => {
    const r = verify({ body: BODY.replace('lead-123', 'lead-999') })
    expect(r.valid).toBe(false)
  })

  it('odmietne iné svix-id pri tom istom tele', () => {
    // Dôkaz, že sa podpisuje `id.timestamp.telo` a nie len telo.
    const r = verify({ id: 'msg_iny' })
    expect(r.valid).toBe(false)
  })

  it('odmietne starú doručenku (replay)', () => {
    const r = verify({ nowSeconds: TS + WEBHOOK_TOLERANCE_SECONDS + 1 })
    expect(r.valid).toBe(false)
    expect(r.reason).toContain('starý')
  })

  it('odmietne timestamp z budúcnosti', () => {
    const r = verify({ nowSeconds: TS - WEBHOOK_TOLERANCE_SECONDS - 1 })
    expect(r.valid).toBe(false)
    expect(r.reason).toContain('budúcnosti')
  })

  it('tesne v tolerancii ešte prejde', () => {
    expect(verify({ nowSeconds: TS + WEBHOOK_TOLERANCE_SECONDS }).valid).toBe(true)
  })

  it('chýbajúce hlavičky sú neplatný podpis, nie povolenie', () => {
    for (const over of [{ id: '' }, { timestamp: '' }, { signatureHeader: '' }]) {
      const r = verify(over)
      expect(r.valid).toBe(false)
      expect(r.reason).toContain('chýbajú svix hlavičky')
    }
  })

  it('chýbajúce tajomstvo neprejde', () => {
    expect(verify({ secret: '' })).toEqual({ valid: false, reason: 'chýba tajomstvo' })
  })

  it('nečíselný timestamp neprejde', () => {
    const r = verify({ timestamp: 'teraz' })
    expect(r.valid).toBe(false)
    expect(r.reason).toContain('nie je číslo')
  })

  it('PINUJE OPRAVU: stará schéma (hex HMAC nad telom) je odmietnutá', () => {
    // Presne to, čo endpoint počítal pred touto opravou. Keby to prešlo,
    // znamenalo by to, že sme sa vrátili k stavu, v ktorom každá skutočná
    // doručenka dostala 401.
    const legacyHex = crypto
      .createHmac('sha256', SECRET)
      .update(BODY)
      .digest('hex')
    expect(verify({ signatureHeader: legacyHex }).valid).toBe(false)
    expect(verify({ signatureHeader: `v1,${legacyHex}` }).valid).toBe(false)
  })
})
