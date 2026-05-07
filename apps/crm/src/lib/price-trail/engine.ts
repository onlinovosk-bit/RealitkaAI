// ================================================================
// Revolis.AI — Price Trail Engine
// Server-side: add points, compute motivation, check alerts
// ================================================================
import { createClient }  from '@/lib/supabase/server'
import { logEvent }      from '@/lib/events/log-event'
import type {
  PricePoint, SellerMotivation, NegotiationBrief,
  AddPricePointResult, PriceAlert, ChartPoint, PriceSource,
} from '@/types/price-trail'

// ── Add a new price observation ───────────────────────────────
export async function addPricePoint(opts: {
  profileId:   string
  price:       number
  source:      PriceSource
  listingId?:  string
  propertyId?: string
  leadId?:     string
  note?:       string
}): Promise<AddPricePointResult | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('add_price_point', {
    p_profile_id:  opts.profileId,
    p_price:       opts.price,
    p_source:      opts.source,
    p_listing_id:  opts.listingId  ?? null,
    p_property_id: opts.propertyId ?? null,
    p_lead_id:     opts.leadId     ?? null,
    p_note:        opts.note       ?? null,
  })

  if (error) {
    console.error('[price-trail] add_price_point:', error.message)
    return null
  }

  const result = data as AddPricePointResult

  // Log event for BRI recomputation downstream
  if (result?.is_drop && (opts.listingId || opts.leadId)) {
    await logEvent({
      profileId:  opts.profileId,
      entityType: opts.leadId ? 'lead' : 'property',
      entityId:   opts.leadId ?? opts.listingId ?? null,
      eventType:  'property_price_changed',
      payload: {
        direction:   'down',
        old_price:   result.prev_price,
        new_price:   result.price,
        delta_eur:   result.delta_eur,
        delta_pct:   result.delta_pct,
        listing_id:  opts.listingId,
        property_id: opts.propertyId,
        drop_count:  result.motivation?.drop_count ?? 1,
      },
    })

    // Check and dispatch price alerts
    await checkAndDispatchAlerts(opts.profileId, result, opts)
  }

  return result
}

// ── Fetch trail as chart-ready points ────────────────────────
export async function getPriceTrail(opts: {
  profileId:   string
  listingId?:  string
  propertyId?: string
  limit?:      number
}): Promise<ChartPoint[]> {
  const supabase = await createClient()

  let query = supabase
    .from('property_price_trail')
    .select('price, delta_eur, delta_pct, is_drop, note, source, recorded_at')
    .eq('profile_id', opts.profileId)
    .order('recorded_at', { ascending: true })
    .limit(opts.limit ?? 100)

  if (opts.listingId)  query = query.eq('listing_id',  opts.listingId)
  if (opts.propertyId) query = query.eq('property_id', opts.propertyId)

  const { data } = await query

  return (data ?? []).map(row => ({
    date:      row.recorded_at,
    price:     row.price,
    is_drop:   row.is_drop,
    delta_eur: row.delta_eur,
    delta_pct: row.delta_pct,
    note:      row.note,
    source:    row.source as PriceSource,
  }))
}

// ── Get negotiation brief for a property ─────────────────────
export async function getNegotiationBrief(opts: {
  profileId:   string
  listingId?:  string
  propertyId?: string
}): Promise<NegotiationBrief | null> {
  const supabase = await createClient()

  let query = supabase
    .from('negotiation_briefs')
    .select('*')
    .eq('profile_id', opts.profileId)

  if (opts.listingId)  query = query.eq('listing_id',  opts.listingId)
  if (opts.propertyId) query = query.eq('property_id', opts.propertyId)

  const { data, error } = await query.single()
  if (error && error.code !== 'PGRST116') console.error('[price-trail] brief fetch error', error.message)
  return (data as NegotiationBrief) ?? null
}

// ── Get top motivated sellers for a workspace ─────────────────
export async function getTopMotivatedSellers(
  profileId: string,
  tier:      'urgent' | 'high' | 'medium' = 'high',
  limit:     number = 10
): Promise<NegotiationBrief[]> {
  const supabase = await createClient()

  const tiers = tier === 'urgent'
    ? ['urgent']
    : tier === 'high'
    ? ['urgent', 'high']
    : ['urgent', 'high', 'medium']

  const { data } = await supabase
    .from('negotiation_briefs')
    .select('*')
    .eq('profile_id', profileId)
    .in('motivation_tier', tiers)
    .order('motivation_score', { ascending: false })
    .limit(limit)

  return (data ?? []) as NegotiationBrief[]
}

// ── Bulk sync from portal_listings → property_price_trail ─────
// Called after every portal import to seed/update price trail
export async function syncFromPortalListings(
  profileId: string,
  source:    PriceSource = 'portal_import'
): Promise<number> {
  const supabase = await createClient()

  // Get listings for this profile where price changed
  const { data: listings } = await supabase
    .from('portal_listings')
    .select('id, price, last_price')
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .not('price', 'is', null)

  if (!listings?.length) return 0

  // Batch-fetch last recorded price for all listings (one query instead of N)
  const { data: lastPoints } = await supabase
    .from('property_price_trail')
    .select('listing_id, price')
    .eq('profile_id', profileId)
    .in('listing_id', listings.map(l => l.id))
    .order('recorded_at', { ascending: false })

  const lastPriceMap = new Map<string, number>()
  for (const pt of (lastPoints ?? [])) {
    if (!lastPriceMap.has(pt.listing_id)) lastPriceMap.set(pt.listing_id, pt.price as number)
  }

  const toSync = listings.filter(l => l.price && lastPriceMap.get(l.id) !== l.price)
  if (!toSync.length) return 0

  const results = await Promise.all(
    toSync.map(listing => addPricePoint({
      profileId,
      price:     listing.price,
      source,
      listingId: listing.id,
    }))
  )

  return results.filter(Boolean).length
}

// ── Price alert management ─────────────────────────────────────
export async function createAlert(opts: {
  profileId:   string
  listingId?:  string
  propertyId?: string
  leadId?:     string
  watchType:   PriceAlert['watch_type']
  thresholdEur?: number
  targetPrice?:  number
}): Promise<PriceAlert | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('price_alerts')
    .insert({
      profile_id:    opts.profileId,
      listing_id:    opts.listingId    ?? null,
      property_id:   opts.propertyId   ?? null,
      lead_id:       opts.leadId       ?? null,
      watch_type:    opts.watchType,
      threshold_eur: opts.thresholdEur ?? null,
      target_price:  opts.targetPrice  ?? null,
    })
    .select()
    .single()
  return (data as PriceAlert) ?? null
}

// ── Internal: check and dispatch alerts ───────────────────────
async function checkAndDispatchAlerts(
  profileId: string,
  result:    AddPricePointResult,
  opts:      { listingId?: string; propertyId?: string; leadId?: string }
): Promise<void> {
  const supabase = await createClient()

  const { data: alerts } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .or([
      opts.listingId  ? `listing_id.eq.${opts.listingId}`   : null,
      opts.propertyId ? `property_id.eq.${opts.propertyId}` : null,
    ].filter(Boolean).join(','))

  if (!alerts?.length) return

  await Promise.all(
    (alerts as PriceAlert[]).map(async (alert) => {
      let triggered = false

      switch (alert.watch_type) {
        case 'any_drop':
          triggered = result.is_drop
          break
        case 'drop_threshold':
          triggered = result.is_drop &&
            Math.abs(result.delta_eur ?? 0) >= (alert.threshold_eur ?? 0)
          break
        case 'target_price':
          triggered = result.price <= (alert.target_price ?? 0)
          break
      }

      if (!triggered) return

      await Promise.all([
        supabase
          .from('price_alerts')
          .update({
            last_triggered_at: new Date().toISOString(),
            trigger_count:     (alert.trigger_count ?? 0) + 1,
          })
          .eq('id', alert.id),
        dispatchAlertNotification(profileId, alert, result),
      ])
    })
  )
}

async function dispatchAlertNotification(
  profileId: string,
  alert:     PriceAlert,
  result:    AddPricePointResult
): Promise<void> {
  if (!alert.notify_email) return

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', profileId)
    .single()

  if (!profile?.email) return

  // Get property details
  let address = 'Sledovaná nehnuteľnosť'
  if (alert.listing_id) {
    const { data: listing } = await supabase
      .from('portal_listings')
      .select('title, city, street')
      .eq('id', alert.listing_id)
      .single()
    address = listing
      ? `${listing.street ?? ''} ${listing.city ?? ''}`.trim() || listing.title
      : address
  }

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY!)

  await resend.emails.send({
    from:    'Revolis.AI <alerts@revolis.ai>',
    to:      profile.email,
    subject: `Cenový alert: ${address} → ${result.price.toLocaleString('sk-SK')} € (${result.delta_pct?.toFixed(1)}%)`,
    html: `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
  <div style="background:#FCEBEB;border-left:4px solid #E24B4A;padding:20px;border-radius:8px;">
    <p style="color:#791F1F;font-size:12px;font-weight:bold;margin:0 0 8px;text-transform:uppercase;">
      Cenový alert — Revolis.AI
    </p>
    <h2 style="color:#0F172A;margin:0 0 4px;font-size:20px;">${address}</h2>
    <p style="color:#E24B4A;font-size:28px;font-weight:bold;margin:0 0 8px;">
      ${result.price.toLocaleString('sk-SK')} €
    </p>
    <p style="color:#791F1F;margin:0;">
      Pokles o ${Math.abs(result.delta_eur ?? 0).toLocaleString('sk-SK')} €
      (${Math.abs(result.delta_pct ?? 0).toFixed(1)}%)
      z ${result.prev_price?.toLocaleString('sk-SK')} €
    </p>
  </div>
  <a href="https://app.revolis.ai"
     style="display:inline-block;margin-top:16px;background:#0A6E8A;color:white;
            padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
    Otvoriť v Revolis.AI →
  </a>
  <p style="color:#94A3B8;font-size:11px;margin-top:20px;">
    Revolis.AI · <a href="https://app.revolis.ai/settings/alerts" style="color:#94A3B8;">Spravovať alerty</a>
  </p>
</div>`,
  })
}
