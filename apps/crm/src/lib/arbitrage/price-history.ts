// ================================================================
// Revolis.AI — Price History Tracker
// Records and analyses price changes per listing
// ================================================================
import { createClient } from '@/lib/supabase/server'
import type { PortalListing } from '@/types/arbitrage'

export interface PriceDropSignal {
  listing_id:    string
  drop_count:    number
  total_drop_eur: number
  total_drop_pct: number
  first_price:   number
  current_price: number
  days_declining: number
}

/**
 * Record a price change when a listing is updated.
 * Returns the drop signal if price decreased.
 */
export async function recordPriceChange(
  listingId:  string,
  source:     string,
  newPrice:   number,
  oldPrice:   number | null
): Promise<{ dropped: boolean; drop_pct: number }> {
  const supabase = await createClient()

  await supabase
    .from('listing_price_history')
    .insert({ listing_id: listingId, source, price: newPrice })

  if (!oldPrice || oldPrice <= 0) return { dropped: false, drop_pct: 0 }

  const dropped  = newPrice < oldPrice
  const drop_pct = dropped ? ((oldPrice - newPrice) / oldPrice) * 100 : 0

  return { dropped, drop_pct: Math.round(drop_pct * 10) / 10 }
}

/**
 * Analyse price history for a listing.
 * Returns motivation signal: how many times dropped + total drop.
 */
export async function getPriceDropSignal(
  listingId: string
): Promise<PriceDropSignal | null> {
  const supabase = await createClient()

  const { data: history } = await supabase
    .from('listing_price_history')
    .select('price, recorded_at')
    .eq('listing_id', listingId)
    .order('recorded_at', { ascending: true })

  if (!history || history.length < 2) return null

  const prices    = history.map(h => h.price as number)
  const firstPrice = prices[0]
  const lastPrice  = prices[prices.length - 1]

  // Count actual drops (not just fluctuations)
  let dropCount = 0
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] < prices[i - 1] * 0.99) dropCount++  // >1% drop = real drop
  }

  if (dropCount === 0) return null

  const daysDeclining = Math.round(
    (new Date(history[history.length - 1].recorded_at).getTime() -
     new Date(history[0].recorded_at).getTime()) / 86400000
  )

  return {
    listing_id:     listingId,
    drop_count:     dropCount,
    total_drop_eur: Math.round(firstPrice - lastPrice),
    total_drop_pct: Math.round(((firstPrice - lastPrice) / firstPrice) * 100 * 10) / 10,
    first_price:    firstPrice,
    current_price:  lastPrice,
    days_declining: daysDeclining,
  }
}

/**
 * Get top price-dropping listings for a city — motivation radar.
 */
export async function getTopPriceDrops(
  city:  string,
  limit: number = 10
): Promise<Array<{ listing_id: string; drop_pct: number; address: string; source: string }>> {
  const supabase = await createClient()

  // Find listings where current price < first recorded price by >5%
  let data: any = null
  try {
    const rpcResult = await supabase.rpc('get_top_price_drops', {
      p_city:  city,
      p_limit: limit,
    })
    data = rpcResult.data
  } catch {
    data = null
  }

  // Fallback: direct query if RPC not available
  if (!data) {
    const { data: listings } = await supabase
      .from('portal_listings')
      .select('id, city, street, location_raw, source, price, last_price')
      .eq('city', city)
      .eq('is_active', true)
      .not('last_price', 'is', null)
      .limit(100)

    if (!listings) return []

    return listings
      .filter(l => l.last_price && l.price && l.price < l.last_price * 0.95)
      .map(l => ({
        listing_id: l.id,
        drop_pct:   Math.round(((l.last_price - l.price) / l.last_price) * 100 * 10) / 10,
        address:    l.street ?? l.location_raw ?? l.city,
        source:     l.source,
      }))
      .sort((a, b) => b.drop_pct - a.drop_pct)
      .slice(0, limit)
  }

  return data
}
