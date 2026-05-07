// ================================================================
// Revolis.AI — Arbitrage Scan Orchestrator
// Runs the full pipeline: fetch → parse → upsert → match → save
// ================================================================
import { createClient }         from '@/lib/supabase/server'
import { logEvent }             from '@/lib/events/log-event'
import { parseBazosRSS }        from './parsers/bazos-parser'
import { findMatches }          from './matchers/cross-portal-matcher'
import { recordPriceChange }    from './price-history'
import type {
  PortalListing, ArbitrageConfig, ScanSummary,
} from '@/types/arbitrage'

const UPSERT_BATCH_SIZE = 50   // listings per DB upsert batch
const SCAN_TIMEOUT_MS   = 25_000  // 25s — stay under Vercel 30s limit

/**
 * Run a full arbitrage scan for one profile.
 */
export async function runArbitrageScan(
  profileId: string
): Promise<ScanSummary> {
  const summary: ScanSummary = {
    profile_id:        profileId,
    scan_started_at:   new Date().toISOString(),
    scan_finished_at:  '',
    listings_fetched:  0,
    listings_upserted: 0,
    matches_found:     0,
    matches_new:       0,
    errors:            [],
  }

  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS)

  try {
    const supabase = await createClient()

    // ── 1. Load config ───────────────────────────────────────
    let config = await loadConfig(profileId)
    if (!config?.enabled) {
      summary.scan_finished_at = new Date().toISOString()
      return summary
    }

    // ── 2. Fetch Bazoš RSS for each region ───────────────────
    const bazosListings: Partial<PortalListing>[] = []

    for (const region of config.regions) {
      const result = await parseBazosRSS(region, undefined, controller.signal)
      bazosListings.push(...result.listings)
      summary.errors.push(...result.errors)
      // Polite delay between RSS requests
      await delay(800)
    }

    for (const city of config.cities) {
      const result = await parseBazosRSS(undefined, city, controller.signal)
      bazosListings.push(...result.listings)
      summary.errors.push(...result.errors)
      await delay(800)
    }

    summary.listings_fetched += bazosListings.length

    // ── 3. Load portal listings for this workspace ────────────
    const { data: portalRows } = await supabase
      .from('portal_listings')
      .select('*')
      .eq('profile_id', profileId)
      .eq('is_active', true)
      .in('source', ['nehnutelnosti_sk', 'reality_sk', 'byty_sk', 'topreality_sk'])
      .limit(2000)

    const portalListings = (portalRows ?? []) as PortalListing[]

    // ── 4. Upsert Bazoš listings to shared cache ──────────────
    const upserted = await upsertListings(bazosListings, null)
    summary.listings_upserted += upserted.count

    // Track price changes for existing listings
    for (const change of upserted.priceChanges) {
      await recordPriceChange(
        change.id, change.source, change.newPrice, change.oldPrice
      )
    }

    // ── 5. Fetch freshly upserted Bazoš listings from DB ─────
    const cities = [
      ...new Set([...config.regions, ...config.cities].map(r => r.toLowerCase()))
    ]

    const { data: freshBazos } = await supabase
      .from('portal_listings')
      .select('*')
      .eq('source', 'bazos_sk')
      .eq('is_active', true)
      .in('city', cities)
      .gte('last_seen_at', new Date(Date.now() - 12 * 3600_000).toISOString())
      .limit(1000)

    const bazosForMatching = (freshBazos ?? []) as PortalListing[]
    summary.listings_fetched += bazosForMatching.length

    if (portalListings.length === 0 || bazosForMatching.length === 0) {
      summary.scan_finished_at = new Date().toISOString()
      await updateLastScanAt(profileId)
      return summary
    }

    // ── 6. Run cross-portal matching ──────────────────────────
    const candidates = findMatches(portalListings, bazosForMatching, {
      min_delta_pct:   config.min_delta_pct,
      min_delta_eur:   config.min_delta_eur,
      min_match_score: config.min_match_score,
    })

    summary.matches_found = candidates.length

    // ── 7. Upsert new matches — parallel per candidate ───────
    const matchCounts = await Promise.all(
      candidates.map(async (cand) => {
        const { data: bazosHistory } = await supabase
          .from('listing_price_history')
          .select('price')
          .eq('listing_id', cand.bazos.id)
          .order('recorded_at', { ascending: true })

        const priceDropCount = countPriceDrops(
          (bazosHistory ?? []).map(h => h.price as number)
        )

        const match = {
          profile_id:        profileId,
          listing_portal:    cand.portal.id,
          listing_bazos:     cand.bazos.id,
          price_portal:      cand.portal.price!,
          price_bazos:       cand.bazos.price!,
          delta_eur:         cand.delta_eur,
          delta_pct:         cand.delta_pct,
          match_score:       Math.round(cand.score * 1000) / 1000,
          match_reasons:     cand.reasons,
          city:              cand.portal.city,
          address_display:   cand.portal.street ?? cand.portal.location_raw,
          price_drop_count:  priceDropCount,
          seller_is_private: cand.bazos.seller_type === 'private',
          expires_at:        new Date(Date.now() + 14 * 86400_000).toISOString(),
        }

        const { error: matchErr } = await supabase
          .from('arbitrage_matches')
          .upsert(match, { onConflict: 'listing_portal,listing_bazos', ignoreDuplicates: false })

        return matchErr ? 0 : 1
      })
    )
    summary.matches_new = matchCounts.reduce((s, n) => s + n, 0)

    // ── 8. Log event ─────────────────────────────────────────
    await logEvent({
      profileId,
      entityType: 'system',
      entityId:   null,
      eventType:  'arbitrage_detected',
      payload: {
        matches_found: summary.matches_found,
        matches_new:   summary.matches_new,
        listings_scanned: summary.listings_fetched,
      },
    })

    await updateLastScanAt(profileId)

  } catch (err: any) {
    if (err.name !== 'AbortError') {
      summary.errors.push(`Scan error: ${err.message}`)
    }
  } finally {
    clearTimeout(timeout)
    summary.scan_finished_at = new Date().toISOString()
  }

  return summary
}

// ── Helpers ───────────────────────────────────────────────────

async function loadConfig(profileId: string): Promise<ArbitrageConfig | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('arbitrage_config')
    .select('*')
    .eq('profile_id', profileId)
    .single()

  if (data) return data as ArbitrageConfig
  if (error && error.code !== 'PGRST116') {
    console.error('[arbitrage] config fetch error', error.message)
    return null
  }

  // Create defaults
  const { data: created, error: createErr } = await supabase
    .from('arbitrage_config')
    .insert({ profile_id: profileId })
    .select()
    .single()

  if (createErr) console.error('[arbitrage] config create error', createErr.message)
  return (created as ArbitrageConfig) ?? null
}

interface UpsertResult {
  count:        number
  priceChanges: Array<{ id: string; source: string; newPrice: number; oldPrice: number | null }>
}

async function upsertListings(
  listings:  Partial<PortalListing>[],
  profileId: string | null
): Promise<UpsertResult> {
  const supabase = await createClient()
  let count = 0
  const priceChanges: UpsertResult['priceChanges'] = []

  // Get existing prices for change detection
  const externalIds = listings
    .map(l => l.external_id)
    .filter(Boolean) as string[]

  const { data: existing } = await supabase
    .from('portal_listings')
    .select('id, external_id, source, price')
    .in('external_id', externalIds.slice(0, 500))

  const priceMap = new Map(
    (existing ?? []).map(e => [`${e.source}_${e.external_id}`, { id: e.id, price: e.price }])
  )

  // Batch upsert
  for (let i = 0; i < listings.length; i += UPSERT_BATCH_SIZE) {
    const batch = listings.slice(i, i + UPSERT_BATCH_SIZE).map(l => ({
      ...l,
      profile_id:   profileId,
      last_seen_at: new Date().toISOString(),
      is_active:    true,
    }))

    const { data: upserted, error } = await supabase
      .from('portal_listings')
      .upsert(batch, { onConflict: 'source,external_id', ignoreDuplicates: false })
      .select('id, external_id, source, price')

    if (!error && upserted) {
      count += upserted.length
      for (const row of upserted) {
        const key = `${row.source}_${row.external_id}`
        const old = priceMap.get(key)
        if (old && old.price !== row.price) {
          priceChanges.push({
            id:       old.id,
            source:   row.source,
            newPrice: row.price,
            oldPrice: old.price,
          })
        }
      }
    }
  }

  return { count, priceChanges }
}

function countPriceDrops(prices: number[]): number {
  if (prices.length < 2) return 0
  let drops = 0
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] < prices[i - 1] * 0.99) drops++
  }
  return drops
}

async function updateLastScanAt(profileId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('arbitrage_config')
    .upsert(
      { profile_id: profileId, last_scan_at: new Date().toISOString() },
      { onConflict: 'profile_id' }
    )
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
