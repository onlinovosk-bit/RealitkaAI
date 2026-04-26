// ================================================================
// Revolis.AI — Listing normaliser
// Cleans raw portal data into consistent shape for matching
// ================================================================
import type { PortalListing, PropertyType } from '@/types/arbitrage'
import { createHash } from 'crypto'

// ── Street prefix strip — SK specific ────────────────────────
const STREET_PREFIXES = [
  /\b(ul\.|ulica|nám\.|námestie|nám\b|sídl\.|sídlisko|sídl\b|tr\.|trieda)\b/gi,
  /\b(č\.|číslo)\s*\d+/gi,
]

export function normaliseStreet(raw: string): string {
  let s = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
  for (const rx of STREET_PREFIXES) s = s.replace(rx, '')
  return s
    .replace(/\b(ul|ulica|nam|namestie|sidl|sidlisko|tr|trieda)\b/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
}

// ── City normalisation ────────────────────────────────────────
const CITY_ALIASES: Record<string, string> = {
  'prešov':  'presov',  'presov': 'presov',
  'košice':  'kosice',  'kosice': 'kosice',
  'bratislava': 'bratislava', 'ba': 'bratislava',
  'žilina':  'zilina',  'zilina': 'zilina',
  'banská bystrica': 'banska bystrica', 'bb': 'banska bystrica',
  'nitra':   'nitra',
  'trnava':  'trnava',
  'trenčín': 'trencin', 'trencin': 'trencin',
}

export function normaliseCity(raw: string): string {
  const lower = raw.toLowerCase().trim()
  return CITY_ALIASES[lower] ?? lower
    .replace(/[^\wáäčďéíľĺňóôŕšťúýž\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Area bucket: round to nearest 5m² ────────────────────────
export function areaBucket(m2: number | null): number {
  if (!m2) return 0
  return Math.round(m2 / 5) * 5
}

// ── Rooms bucket: round to nearest 0.5 ───────────────────────
export function roomsBucket(rooms: number | null): number {
  if (!rooms) return 0
  return Math.round(rooms * 2) / 2
}

// ── Property type normaliser ──────────────────────────────────
const TYPE_MAP: Record<string, PropertyType> = {
  byt: 'apartment', apartmán: 'apartment', apartment: 'apartment',
  '1-izbový': 'apartment', '2-izbový': 'apartment', '3-izbový': 'apartment',
  '4-izbový': 'apartment', '5-izbový': 'apartment',
  rodinný: 'house', dom: 'house', chata: 'cottage', vila: 'house',
  pozemok: 'land', stavebný: 'land', záhrada: 'land',
  komerčné: 'commercial', kancelária: 'commercial', sklad: 'commercial',
  garáž: 'other',
}

export function normalisePropertyType(raw: string): PropertyType {
  const lower = raw.toLowerCase()
  for (const [key, type] of Object.entries(TYPE_MAP)) {
    if (lower.includes(key)) return type
  }
  return 'other'
}

// ── Price normaliser: "150 000 €" → 150000 ───────────────────
export function normalisePrice(raw: string | number | null): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return isNaN(raw) ? null : raw
  const cleaned = String(raw)
    .replace(/\s/g, '')
    .replace(/[€$]/g, '')
    .replace(/,/g, '.')
    .replace(/[^0-9.]/g, '')
  const val = parseFloat(cleaned)
  return isNaN(val) ? null : val
}

// ── Property hash (deterministic fingerprint) ─────────────────
export function computePropertyHash(listing: Partial<PortalListing>): string {
  const parts = [
    listing.property_type ?? 'unknown',
    roomsBucket(listing.rooms ?? null).toFixed(1),
    areaBucket(listing.area_m2 ?? null).toString(),
    normaliseCity(listing.city ?? ''),
    normaliseStreet(listing.street ?? listing.location_raw ?? ''),
  ]
  return createHash('md5').update(parts.join('|')).digest('hex')
}

// ── Location hash (city + street only — for loose matching) ──
export function computeLocationHash(listing: Partial<PortalListing>): string {
  const parts = [
    normaliseCity(listing.city ?? ''),
    normaliseStreet(listing.street ?? listing.location_raw ?? ''),
  ]
  return createHash('md5').update(parts.join('|')).digest('hex')
}

// ── Normalise a full listing ──────────────────────────────────
export function normaliseListing(
  raw: Partial<PortalListing>
): Partial<PortalListing> {
  const city   = normaliseCity(raw.city ?? raw.location_raw ?? '')
  const street = normaliseStreet(raw.street ?? raw.location_raw ?? '')

  const normalised: Partial<PortalListing> = {
    ...raw,
    city,
    price:         normalisePrice(raw.price ?? null),
    property_type: normalisePropertyType(String(raw.property_type ?? '')),
    location_hash: computeLocationHash({ city, street }),
    property_hash: computePropertyHash({ ...raw, city, street }),
  }

  if (normalised.price && normalised.area_m2) {
    normalised.price_per_m2 = Math.round(normalised.price / normalised.area_m2)
  }

  return normalised
}
