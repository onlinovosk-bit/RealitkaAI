import { PoolClient } from 'pg'
import { CanonicalListing } from '../canonical/listing'
import { OutboxEvent, OutboxEventType } from './outbox'

export interface DiffResult {
  created: number
  updated: number
  unchanged: number
  withdrawn: number
  events: OutboxEvent[]
}

const WITHDRAW_AFTER_MISSES = 2

export async function diffAndPersist(
  client: PoolClient,
  organizationId: string,
  incoming: CanonicalListing[],
  vendor: string
): Promise<DiffResult> {
  const result: DiffResult = { created: 0, updated: 0, unchanged: 0, withdrawn: 0, events: [] }

  // Load current stored state for this org+vendor
  // Use snake_case aliases to match pg column names exactly
  interface DbRow {
    db_id: string
    vendor_listing_id: string
    db_status: string
    db_price: number
    raw_hash: string
    consecutive_misses: number
  }

  const rows = await client.query<DbRow>(
    `SELECT id AS db_id, vendor_listing_id, status AS db_status, price AS db_price,
            raw_hash, consecutive_misses
     FROM listings
     WHERE organization_id = $1 AND vendor = $2`,
    [organizationId, vendor]
  )

  const storedMap = new Map<string, DbRow>()
  for (const row of rows.rows) storedMap.set(row.vendor_listing_id, row)

  const seenIds = new Set<string>()

  for (const listing of incoming) {
    seenIds.add(listing.vendorListingId)
    const stored = storedMap.get(listing.vendorListingId)

    if (!stored) {
      // New listing
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO listings
           (organization_id, vendor, vendor_listing_id, status, title, description,
            listing_type, price, currency, area_m2, rooms, floor,
            country, region, city, district, street, lat, lon,
            raw_hash, attributes, consecutive_misses, last_seen_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,0,NOW())
         RETURNING id`,
        [
          organizationId, vendor, listing.vendorListingId, listing.status,
          listing.title, listing.description ?? null, listing.listingType,
          listing.price, listing.currency,
          listing.areaM2 ?? null, listing.rooms ?? null, listing.floor ?? null,
          listing.location.country, listing.location.region ?? null,
          listing.location.city, listing.location.district ?? null,
          listing.location.street ?? null, listing.location.lat ?? null,
          listing.location.lon ?? null, listing.rawHash,
          JSON.stringify(listing.attributes),
        ]
      )
      const listingId = inserted.rows[0].id

      await insertMedia(client, organizationId, listingId, listing)

      result.events.push({
        organizationId, eventType: 'ListingCreated', aggregateId: listingId,
        payload: { vendorListingId: listing.vendorListingId, price: listing.price, status: listing.status },
      })
      result.created++
      continue
    }

    // Existing listing — check for changes
    if (stored.raw_hash === listing.rawHash) {
      // Identical payload — just reset misses + last_seen
      await client.query(
        `UPDATE listings SET consecutive_misses = 0, last_seen_at = NOW() WHERE id = $1`,
        [stored.db_id]
      )
      result.unchanged++
      continue
    }

    // Something changed — determine which events to emit
    const events: OutboxEventType[] = []
    const priceChanged  = stored.db_price !== listing.price
    const statusChanged = stored.db_status !== listing.status

    if (priceChanged) {
      await client.query(
        `INSERT INTO price_history (organization_id, listing_id, price_from, price_to, currency)
         VALUES ($1, $2, $3, $4, $5)`,
        [organizationId, stored.db_id, stored.db_price, listing.price, listing.currency]
      )
      events.push('PriceChanged')
    }

    if (statusChanged) {
      await client.query(
        `INSERT INTO status_history (organization_id, listing_id, status_from, status_to, reason)
         VALUES ($1, $2, $3, $4, 'realvia_feed')`,
        [organizationId, stored.db_id, stored.db_status, listing.status]
      )
      events.push('StatusChanged')
    }

    if (!priceChanged && !statusChanged) events.push('ListingUpdated')

    await client.query(
      `UPDATE listings SET
         status = $1, title = $2, description = $3, listing_type = $4,
         price = $5, area_m2 = $6, rooms = $7, floor = $8,
         city = $9, district = $10, street = $11, lat = $12, lon = $13,
         raw_hash = $14, attributes = $15,
         consecutive_misses = 0, last_seen_at = NOW()
       WHERE id = $16`,
      [
        listing.status, listing.title, listing.description ?? null, listing.listingType,
        listing.price, listing.areaM2 ?? null, listing.rooms ?? null, listing.floor ?? null,
        listing.location.city, listing.location.district ?? null,
        listing.location.street ?? null, listing.location.lat ?? null, listing.location.lon ?? null,
        listing.rawHash, JSON.stringify(listing.attributes), stored.db_id,
      ]
    )

    for (const eventType of events) {
      result.events.push({
        organizationId, eventType, aggregateId: stored.db_id,
        payload: { vendorListingId: listing.vendorListingId, price: listing.price, status: listing.status },
      })
    }
    result.updated++
  }

  // Handle listings absent from this snapshot
  for (const [vendorId, stored] of storedMap.entries()) {
    if (seenIds.has(vendorId)) continue
    if (stored.db_status === 'withdrawn' || stored.db_status === 'sold') continue

    const newMisses = stored.consecutive_misses + 1
    await client.query(
      `UPDATE listings SET consecutive_misses = $1, last_seen_at = last_seen_at WHERE id = $2`,
      [newMisses, stored.db_id]
    )

    if (newMisses >= WITHDRAW_AFTER_MISSES) {
      await client.query(
        `UPDATE listings SET status = 'withdrawn' WHERE id = $1`,
        [stored.db_id]
      )
      await client.query(
        `INSERT INTO status_history (organization_id, listing_id, status_from, status_to, reason)
         VALUES ($1, $2, $3, 'withdrawn', 'consecutive_misses')`,
        [organizationId, stored.db_id, stored.db_status]
      )
      result.events.push({
        organizationId, eventType: 'ListingRemoved', aggregateId: stored.db_id,
        payload: { vendorListingId: vendorId, consecutiveMisses: newMisses },
      })
      result.withdrawn++
    }
  }

  return result
}

async function insertMedia(
  client: PoolClient,
  organizationId: string,
  listingId: string,
  listing: CanonicalListing
): Promise<void> {
  for (const m of listing.media) {
    await client.query(
      `INSERT INTO media_assets (organization_id, listing_id, vendor_url, media_type, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (listing_id, vendor_url) DO NOTHING`,
      [organizationId, listingId, m.vendorUrl, m.mediaType, m.sortOrder]
    )
  }
}
