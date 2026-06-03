import { createClient } from '@/lib/supabase/server'
import type { ArbitrageMatch, MatchStatus } from '@/types/arbitrage'

const VALID_SORTS = ['delta_eur', 'delta_pct', 'match_score', 'detected_at', 'price_drop_count'] as const
const ACTIVE_STATUSES: MatchStatus[] = ['new', 'viewed']

export type ListMatchesSort = (typeof VALID_SORTS)[number]

export interface ListMatchesOptions {
  profileId: string
  limit?: number
  /** Single status, all rows, or active (new + viewed) — default active */
  status?: MatchStatus | 'all' | 'active'
  city?: string
  minDeltaPct?: number
  sort?: ListMatchesSort
}

const MATCH_SELECT = `
  *,
  portal_listing:listing_portal(
    id, source, external_url, title, price, area_m2,
    rooms, city, street, cover_photo_url, seller_name, seller_phone
  ),
  bazos_listing:listing_bazos(
    id, source, external_url, title, price, area_m2,
    rooms, seller_type, seller_phone, seller_name
  )
`

/**
 * Load arbitrage matches for a profile (shared with GET /api/arbitrage).
 */
export async function listMatchesForProfile(
  options: ListMatchesOptions,
): Promise<ArbitrageMatch[]> {
  const {
    profileId,
    limit = 50,
    status = 'active',
    city,
    minDeltaPct = 0,
    sort = 'delta_eur',
  } = options

  const supabase = await createClient()
  const orderCol = VALID_SORTS.includes(sort) ? sort : 'delta_eur'

  let query = supabase
    .from('arbitrage_matches')
    .select(MATCH_SELECT)
    .eq('profile_id', profileId)

  if (status === 'all') {
    // no status filter
  } else if (status === 'active') {
    query = query.in('status', ACTIVE_STATUSES)
  } else {
    query = query.eq('status', status)
  }

  if (city) query = query.eq('city', city)
  if (minDeltaPct > 0) query = query.gte('delta_pct', minDeltaPct)

  query = query.order(orderCol, { ascending: false }).limit(Math.min(limit, 100))

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to load arbitrage matches: ${error.message}`)
  }

  return (data ?? []) as ArbitrageMatch[]
}
