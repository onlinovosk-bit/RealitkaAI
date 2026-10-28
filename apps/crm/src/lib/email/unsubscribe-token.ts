// ================================================================
// Revolis.AI — podpísaný token odhlasovacieho odkazu
//
// EMAIL-SUPPRESSION-01. Predošlý odkaz v ranom briefe niesol holé UUID profilu
// (`/api/notifications/unsubscribe?profile=<uuid>`): kto poznal UUID, vedel
// niekomu vypnúť notifikácie. Token je HMAC-SHA256, takže ho nik nevyrobí bez
// tajomstva, a nesie len odtlačok adresy — nie adresu — aby sa osobný údaj
// neocital v URL, logoch proxy ani v histórii prehliadača.
//
// Bez expirácie: odhlasovací odkaz musí fungovať aj v mesiace starom e-maile.
// Chýbajúce alebo príliš krátke tajomstvo = token sa nedá vyrobiť ani overiť
// (fail-closed); volajúci rozhodne, čo urobí (odosielanie sa zastaví).
// ================================================================
import { createHmac, timingSafeEqual } from 'node:crypto'

export type UnsubscribeTokenPayload =
  /** Odchádzajúci e-mail agentúry: odhlásenie adresy (odtlačok) u odosielateľa. */
  | { t: 'o'; h: string; a: string }
  /** Ranný brief: vypnutie briefu pre profil. */
  | { t: 'b'; p: string }

const MIN_SECRET_LENGTH = 32
const HASH_RE = /^[0-9a-f]{64}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function secret(): string | null {
  const s = process.env.UNSUBSCRIBE_TOKEN_SECRET?.trim()
  return s && s.length >= MIN_SECRET_LENGTH ? s : null
}

export function unsubscribeSecretConfigured(): boolean {
  return secret() !== null
}

function mac(key: string, body: string): Buffer {
  return createHmac('sha256', key).update(`unsubscribe.v1.${body}`).digest()
}

function isValidPayload(p: unknown): p is UnsubscribeTokenPayload {
  if (!p || typeof p !== 'object') return false
  const o = p as Record<string, unknown>
  if (o.t === 'o') return typeof o.h === 'string' && HASH_RE.test(o.h) && typeof o.a === 'string' && UUID_RE.test(o.a)
  if (o.t === 'b') return typeof o.p === 'string' && UUID_RE.test(o.p)
  return false
}

/** `null`, keď tajomstvo nie je nastavené alebo je krátke. */
export function signUnsubscribeToken(payload: UnsubscribeTokenPayload): string | null {
  const key = secret()
  if (!key || !isValidPayload(payload)) return null
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${mac(key, body).toString('base64url')}`
}

/** `null` pre čokoľvek, čo nie je presne náš podpísaný token. */
export function verifyUnsubscribeToken(token: string | null | undefined): UnsubscribeTokenPayload | null {
  const key = secret()
  if (!key || !token || token.length > 1024) return null

  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts

  const expected = mac(key, body)
  let given: Buffer
  try {
    given = Buffer.from(sig, 'base64url')
  } catch {
    return null
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

  try {
    const parsed: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    return isValidPayload(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Absolútny odkaz na potvrdzovaciu stránku; `null`, keď sa token nedá vyrobiť. */
export function unsubscribeUrl(baseUrl: string, payload: UnsubscribeTokenPayload): string | null {
  const token = signUnsubscribeToken(payload)
  return token ? `${baseUrl.replace(/\/$/, '')}/api/unsubscribe?t=${token}` : null
}
