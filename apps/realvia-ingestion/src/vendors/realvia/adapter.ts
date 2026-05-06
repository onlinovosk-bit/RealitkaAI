import crypto from 'crypto'
import { z } from 'zod'
import { CanonicalListing, ListingStatus, ListingType, MediaType } from '../../canonical/listing'
import { RealviaListingSchema, RealviaResponseSchema, RealviaListing } from './schema'

// ─── VendorAdapter interface ──────────────────────────────────────────────────

export interface FetchResult {
  raw: string          // raw JSON string (persisted to object store)
  listings: CanonicalListing[]
  parseFailures: Array<{ vendorId: string; error: string; raw: unknown }>
  schemaDrifts: number // count of unknown fields encountered
}

export interface VendorAdapter {
  fetchListings(organizationId: string): Promise<FetchResult>
}

// ─── Normalizer helpers ───────────────────────────────────────────────────────

function toListingType(raw: string | undefined): ListingType {
  const map: Record<string, ListingType> = {
    // TBC: map Realvia values to canonical once Phase 0 answers arrive
    byt: 'apartment', dom: 'house', pozemok: 'land', komercia: 'commercial',
    apartment: 'apartment', house: 'house', land: 'land', commercial: 'commercial',
  }
  return map[raw?.toLowerCase() ?? ''] ?? 'other'
}

function toListingStatus(raw: string | undefined): ListingStatus {
  const map: Record<string, ListingStatus> = {
    // TBC: map Realvia status values once confirmed
    aktivny: 'active', aktívny: 'active', active: 'active',
    rezervovany: 'reserved', reserved: 'reserved',
    predany: 'sold', sold: 'sold',
    stiahnuty: 'withdrawn', withdrawn: 'withdrawn',
  }
  return map[raw?.toLowerCase() ?? ''] ?? 'active'
}

function toMediaType(url: string): MediaType {
  if (url.match(/\.(pdf|dwg)$/i)) return 'floorplan'
  if (url.match(/\.(mp4|mov|webm)$/i)) return 'video'
  return 'photo'
}

function normalize(raw: RealviaListing): CanonicalListing {
  const rawStr = JSON.stringify(raw)
  const rawHash = crypto.createHash('sha256').update(rawStr).digest('hex')

  // Capture all known-schema keys; rest goes to attributes
  const knownKeys = new Set([
    'id','nazov','popis','typ','stav','cena','mena','plocha',
    'pocet_izb','podlazie','mesto','okres','kraj','ulica',
    'gps_lat','gps_lon','fotky',
  ])
  const attributes: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (!knownKeys.has(k)) attributes[k] = v
  }

  const media = (raw.fotky ?? []).map((url, i) => ({
    vendorUrl: url,
    mediaType: toMediaType(url),
    sortOrder: i,
  }))

  return {
    vendorListingId: raw.id,
    title:           raw.nazov ?? `Listing ${raw.id}`,
    description:     raw.popis,
    listingType:     toListingType(raw.typ),
    status:          toListingStatus(raw.stav),
    price:           raw.cena ?? 0,
    currency:        raw.mena ?? 'EUR',
    areaM2:          raw.plocha,
    rooms:           raw.pocet_izb,
    floor:           raw.podlazie != null ? Math.round(raw.podlazie) : undefined,
    location: {
      country:  'SK',
      region:   raw.kraj,
      city:     raw.mesto ?? '',
      district: raw.okres,
      street:   raw.ulica,
      lat:      raw.gps_lat,
      lon:      raw.gps_lon,
    },
    media,
    attributes,
    rawHash,
  }
}

// ─── Realvia Adapter — STUB until Phase 0 credentials arrive ─────────────────

export class RealviaAdapter implements VendorAdapter {
  async fetchListings(_organizationId: string): Promise<FetchResult> {
    const baseUrl  = process.env.REALVIA_BASE_URL
    const apiKey   = process.env.REALVIA_API_KEY

    // Phase 0 gate: credentials not yet available
    if (!baseUrl || !apiKey) {
      throw new NotImplementedError(
        'REALVIA_BASE_URL and REALVIA_API_KEY are not configured. ' +
        'Waiting for Phase 0 credentials from Seliga.'
      )
    }

    // Auth mechanism TBD (Phase 0 Q1 — may be Bearer, Basic, mTLS, or query param)
    const res = await fetch(`${baseUrl}/export`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      throw new Error(`Realvia API returned ${res.status}: ${await res.text().catch(() => '')}`)
    }

    const raw = await res.text()
    const json: unknown = JSON.parse(raw)

    const parsed = RealviaResponseSchema.safeParse(json)
    if (!parsed.success) {
      throw new Error(`Unexpected Realvia response shape: ${parsed.error.message}`)
    }

    const listings: CanonicalListing[] = []
    const parseFailures: FetchResult['parseFailures'] = []
    let schemaDrifts = 0

    for (const item of parsed.data.data) {
      const result = RealviaListingSchema.safeParse(item)
      if (!result.success) {
        parseFailures.push({
          vendorId: String((item as Record<string, unknown>)['id'] ?? 'unknown'),
          error:    result.error.message,
          raw:      item,
        })
        continue
      }

      // Detect unknown fields (schema drift)
      const knownKeys = Object.keys(RealviaListingSchema.shape)
      const unknownKeys = Object.keys(result.data).filter(k => !knownKeys.includes(k))
      if (unknownKeys.length > 0) {
        schemaDrifts++
        console.warn('[realvia] schema drift — unknown fields:', unknownKeys.join(', '))
      }

      try {
        listings.push(normalize(result.data as RealviaListing))
      } catch (err) {
        parseFailures.push({
          vendorId: result.data.id,
          error:    (err as Error).message,
          raw:      item,
        })
      }
    }

    return { raw, listings, parseFailures, schemaDrifts }
  }
}

export class NotImplementedError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'NotImplementedError'
  }
}

// Validate Zod schema is consistent (compile-time check)
void ((): z.ZodType => RealviaListingSchema)()
