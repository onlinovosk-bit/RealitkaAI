// ================================================================
// Revolis.AI — overenie podpisu podľa Standard Webhooks (Svix)
//
// Resend podpisuje webhooky cez Svix, ktorý implementuje Standard Webhooks.
// `/api/resend-webhook` doteraz porovnával `svix-signature` s obyčajným
// hex HMAC-om nad telom požiadavky. To sa nemôže rovnať nikdy — schéma je iná
// v troch nezávislých bodoch:
//
//   1. tajomstvo má prefix `whsec_` a zvyšok je base64, ktorý treba DEKÓDOVAŤ
//      na bajty kľúča; pôvodný kód použil celý reťazec ako ASCII kľúč,
//   2. podpisuje sa `{svix-id}.{svix-timestamp}.{telo}`, nie len telo,
//   3. hlavička je `v1,<base64>` (a môže obsahovať VIAC podpisov oddelených
//      medzerou, kvôli rotácii kľúča), nie 64 znakov hexu.
//
// Dôsledok: každá skutočná doručenka z Resendu dostala 401. Reťaz
// „e-mail s tagom → webhook → events" bola teda prerušená hneď na druhom
// článku, ktorý som v #765 označil za funkčný. Nebol.
//
// Implementované nad `node:crypto`, bez novej závislosti: balík `svix` je
// v `node_modules` len tranzitívne (hoistnutý), spoliehať sa na to pri builde
// na Verceli by bola tichá časovaná bomba.
//
// Referencia: `node_modules/standardwebhooks/dist/index.js` — `sign()`,
// `verify()`, `verifyTimestamp()`.
// ================================================================
import crypto from 'node:crypto'

/** Rovnaká tolerancia, akú používa Svix (`WEBHOOK_TOLERANCE_IN_SECONDS`). */
export const WEBHOOK_TOLERANCE_SECONDS = 5 * 60

const SECRET_PREFIX = 'whsec_'

export interface StandardWebhookInput {
  /** Hodnota `RESEND_WEBHOOK_SECRET`, s prefixom `whsec_` alebo bez neho. */
  secret: string
  /** Hlavička `svix-id`. */
  id: string
  /** Hlavička `svix-timestamp` (sekundy od epochy, ako text). */
  timestamp: string
  /** Hlavička `svix-signature` — jeden alebo viac `v1,<base64>` oddelených medzerou. */
  signatureHeader: string
  /** Telo požiadavky presne tak, ako prišlo. Re-serializované JSON podpis rozbije. */
  body: string
  /** Len pre testy — inak aktuálny čas. */
  nowSeconds?: number
}

export interface StandardWebhookResult {
  valid: boolean
  /** Prečo podpis neprešiel. `null` pri úspechu. */
  reason: string | null
}

/**
 * Spočíta podpis tak, ako ho počíta Svix pri odosielaní.
 *
 * Exportované kvôli testom: bez toho by sa dal test napísať len tak, že
 * zopakuje tú istú (možno chybnú) matematiku ako produkčný kód.
 */
export function signStandardWebhook(
  secret: string,
  id: string,
  timestampSeconds: number,
  body: string,
): string {
  const raw = secret.startsWith(SECRET_PREFIX) ? secret.slice(SECRET_PREFIX.length) : secret
  const key = Buffer.from(raw, 'base64')
  const mac = crypto
    .createHmac('sha256', key)
    .update(`${id}.${timestampSeconds}.${body}`, 'utf8')
    .digest('base64')
  return `v1,${mac}`
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) {
    // Konštantný čas aj pri nesúlade dĺžky — rovnaký postup ako v
    // `api/acquire/email/route.ts`.
    crypto.timingSafeEqual(bufA, bufA)
    return false
  }
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * Overí podpis doručenky. Nikdy nevyhodí výnimku a nikdy nevracia `true`
 * „z opatrnosti" — chýbajúca hlavička je neplatný podpis, nie povolenie.
 */
export function verifyStandardWebhook(input: StandardWebhookInput): StandardWebhookResult {
  if (!input.secret) return { valid: false, reason: 'chýba tajomstvo' }
  if (!input.id || !input.timestamp || !input.signatureHeader) {
    return { valid: false, reason: 'chýbajú svix hlavičky (id / timestamp / signature)' }
  }

  const ts = Number.parseInt(input.timestamp, 10)
  if (!Number.isFinite(ts)) {
    return { valid: false, reason: 'svix-timestamp nie je číslo' }
  }

  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000)
  if (now - ts > WEBHOOK_TOLERANCE_SECONDS) {
    return { valid: false, reason: 'svix-timestamp je príliš starý (replay)' }
  }
  if (ts - now > WEBHOOK_TOLERANCE_SECONDS) {
    return { valid: false, reason: 'svix-timestamp je v budúcnosti' }
  }

  const expected = signStandardWebhook(input.secret, input.id, ts, input.body).split(',')[1]

  // Rotácia kľúča: Svix počas prekryvu posiela viac podpisov oddelených
  // medzerou. Stačí, aby sedel jeden.
  for (const versioned of input.signatureHeader.split(' ')) {
    const comma = versioned.indexOf(',')
    if (comma < 0) continue
    if (versioned.slice(0, comma) !== 'v1') continue
    if (safeEqual(versioned.slice(comma + 1), expected)) {
      return { valid: true, reason: null }
    }
  }

  return { valid: false, reason: 'žiadny podpis v hlavičke nesedí' }
}
