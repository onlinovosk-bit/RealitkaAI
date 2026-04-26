// ================================================================
// Revolis.AI — Morning Brief Data Gatherer
// Collects all overnight signals for a single profile
// ================================================================
import { createClient }    from '@/lib/supabase/server'
import { getHotLeads }     from '@/lib/bri/engine'
import type {
  BriefSettings,
  OvernightLVChange,
  OvernightArbitrage,
  OvernightPriceDrop,
  OvernightReply,
} from '@/types/morning-brief'

// How many hours back to look for overnight activity
const OVERNIGHT_WINDOW_HOURS = 10

export interface GatheredData {
  settings:      BriefSettings
  ownerName:     string
  ownerEmail:    string
  hotLeads:      Awaited<ReturnType<typeof getHotLeads>>
  overnight: {
    newLeads:    number
    lvChanges:   OvernightLVChange[]
    arbitrage:   OvernightArbitrage[]
    priceDrops:  OvernightPriceDrop[]
    replies:     OvernightReply[]
  }
  stats: {
    hotLeads:       number
    activeLeads:    number
    newInquiries:   number
    scoreIncreases: number
    weeklyRevForecast: number | null
  }
}

export async function gatherBriefData(profileId: string): Promise<GatheredData | null> {
  const supabase  = await createClient()
  const since     = new Date(Date.now() - OVERNIGHT_WINDOW_HOURS * 3_600_000).toISOString()

  // ── Profile + settings ────────────────────────────────────
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', profileId)
      .single(),
    supabase
      .from('morning_brief_settings')
      .select('*')
      .eq('profile_id', profileId)
      .single(),
  ])

  if (!profile || !settings) return null

  // ── Hot leads (BRI >= 60) ─────────────────────────────────
  const hotLeads = await getHotLeads(profileId, settings.lead_count ?? 5)

  // ── Overnight events ──────────────────────────────────────
  const { data: overnightEvents } = await supabase
    .from('events')
    .select('event_type, entity_id, payload, created_at')
    .eq('profile_id', profileId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200)

  const events = overnightEvents ?? []

  // Count new leads
  const newLeads = events.filter(e => e.event_type === 'lead_created').length

  // Count score increases
  const scoreIncreases = events.filter(
    e => e.event_type === 'bri_score_computed'
      && (e.payload as any)?.delta > 5
  ).length

  // Parse LV changes
  const lvChanges: OvernightLVChange[] = events
    .filter(e => e.event_type === 'lv_change_detected' && settings.include_lv_changes)
    .slice(0, 5)
    .map(e => ({
      parcelId:   (e.payload as any)?.parcel_id   ?? '',
      address:    (e.payload as any)?.address      ?? 'Neznáma adresa',
      changeType: (e.payload as any)?.change_type  ?? 'unknown',
      leadId:     (e.payload as any)?.lead_id      ?? null,
      leadName:   (e.payload as any)?.lead_name    ?? null,
    }))

  // Parse arbitrage detections
  const arbitrage: OvernightArbitrage[] = events
    .filter(e => e.event_type === 'arbitrage_detected' && settings.include_arbitrage)
    .slice(0, 3)
    .map(e => {
      const p = e.payload as any
      const delta = (p?.portal_price ?? 0) - (p?.bazos_price ?? 0)
      return {
        address:     p?.address      ?? '',
        portalPrice: p?.portal_price ?? 0,
        bazosPrice:  p?.bazos_price  ?? 0,
        delta,
        deltaPct:    p?.portal_price ? Math.round(delta / p.portal_price * 100) : 0,
        propertyId:  p?.property_id  ?? '',
      }
    })

  // Parse price drops
  const priceDrops: OvernightPriceDrop[] = events
    .filter(e =>
      e.event_type === 'property_price_changed'
      && (e.payload as any)?.direction === 'down'
      && settings.include_price_drops
    )
    .slice(0, 3)
    .map(e => {
      const p = e.payload as any
      return {
        address:    p?.address    ?? '',
        oldPrice:   p?.old_price  ?? 0,
        newPrice:   p?.new_price  ?? 0,
        dropPct:    p?.old_price
          ? Math.round((p.old_price - p.new_price) / p.old_price * 100)
          : 0,
        dropCount:  p?.drop_count ?? 1,
        propertyId: p?.property_id ?? '',
      }
    })

  // Parse replies (high-value overnight signal)
  const replyEventIds = events
    .filter(e => e.event_type === 'message_replied')
    .slice(0, 3)
    .map(e => e.entity_id)
    .filter(Boolean) as string[]

  let replies: OvernightReply[] = []
  if (replyEventIds.length > 0) {
    const { data: leadData } = await supabase
      .from('leads')
      .select('id, full_name, email')
      .in('id', replyEventIds)

    replies = (leadData ?? []).map(lead => ({
      leadId:         lead.id,
      leadName:       lead.full_name,
      repliedAt:      events.find(e => e.entity_id === lead.id)?.created_at ?? '',
      messagePreview: 'Odpovedal na vašu správu',
    }))
  }

  // ── Active leads count ────────────────────────────────────
  const { count: activeLeads } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('status', 'active')

  return {
    settings:  settings as BriefSettings,
    ownerName:  profile.full_name  ?? 'Maklér',
    ownerEmail: profile.email,
    hotLeads,
    overnight: { newLeads, lvChanges, arbitrage, priceDrops, replies },
    stats: {
      hotLeads:       hotLeads.length,
      activeLeads:    activeLeads ?? 0,
      newInquiries:   newLeads,
      scoreIncreases,
      weeklyRevForecast: null,
    },
  }
}
