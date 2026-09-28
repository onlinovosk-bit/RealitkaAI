// ================================================================
// Revolis.AI — Morning Brief Data Gatherer
// Collects all overnight signals for a single profile
// ================================================================
import { createAdminClient } from '@/lib/supabase/server'
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
    pendingContact: number
    hotPending: number
    staleContacts48h: number
    pipelineValueEur: number
    priorityLeadNames: string[]
    priceDropCount: number
  }
}

const STALE_HOURS = 48

function parseBudgetEur(raw: unknown): number {
  if (typeof raw !== 'string') return 0
  const digits = raw.replace(/[^\d]/g, '')
  const n = parseInt(digits, 10)
  return Number.isFinite(n) ? n : 0
}

export async function gatherBriefData(profileId: string): Promise<GatheredData | null> {
  const supabase  = createAdminClient()
  const since     = new Date(Date.now() - OVERNIGHT_WINDOW_HOURS * 3_600_000).toISOString()

  // ── Profile + settings ────────────────────────────────────
  const [{ data: profile, error: profileErr }, { data: settings, error: settingsErr }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, email, agency_id')
      .eq('id', profileId)
      .single(),
    supabase
      .from('morning_brief_settings')
      .select('*')
      .eq('profile_id', profileId)
      .single(),
  ])
  if (profileErr) console.error('[gather] profile fetch error', profileErr.message)
  if (settingsErr) console.error('[gather] settings fetch error', settingsErr.message)

  if (!profile || !settings) return null

  // ── Hot leads (BRI >= 60) ─────────────────────────────────
  const hotLeads = await getHotLeads(profileId, settings.lead_count ?? 5, supabase)

  // ── Overnight events ──────────────────────────────────────
  const { data: overnightEvents } = await supabase
    .from('events')
    .select('event_type, entity_id, payload, created_at')
    .eq('profile_id', profileId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200)

  const events = overnightEvents ?? []

  // ── New leads ─────────────────────────────────────────────
  // Counted from `leads`, NOT from `events`.
  //
  // `events` has never held a row in production (EVENTS-PIPELINE-AUDIT, #724):
  // its INSERT policy requires auth.uid(), every writer that feeds it is cron
  // or a webhook with no session, and logEvent swallows the rejection. Counting
  // 'lead_created' rows therefore returned 0 on every single day — including
  // days when leads really did arrive. A brief a broker acts on at 8am is the
  // worst place for a false zero. `director-brief.ts` already counts this
  // correctly, straight from `leads`.
  //
  // Scoped by agency, not by assignee: a lead that arrived overnight usually
  // is not assigned yet (7 of the last 14 production leads have
  // assigned_profile_id NULL), so scoping by assignee would reintroduce the
  // same false zero for exactly the fresh demand this number exists to report.
  const { count: newLeadCount, error: newLeadErr } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', profile.agency_id)
    .gte('created_at', since)

  if (newLeadErr) console.error('[gather] new lead count error', newLeadErr.message)

  const newLeads = newLeadCount ?? 0

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
  // These four queries used to filter on `leads.profile_id` and select
  // `leads.full_name`. Neither column exists: the table has `agency_id`,
  // `assigned_profile_id` and `name`. PostgREST rejected every one of them,
  // the errors were never read, and `?? 0` turned each rejection into a zero.
  // activeLeads, pipelineValueEur, priorityLeadNames and staleContacts48h were
  // therefore permanently 0 / empty — a second false zero behind the first one
  // (EVENTS-PIPELINE-AUDIT, #724).
  //
  // Scoped by assignee here, unlike newLeads above: these are "my leads"
  // numbers, and 493 of 511 production leads carry assigned_profile_id, so the
  // scope resolves to real work. A lead nobody owns is nobody's pipeline.
  const staleCutoff = new Date(Date.now() - STALE_HOURS * 3_600_000).toISOString()

  const [{ count: activeLeads }, { data: pipelineLeads }, { data: priorityLeads }, { count: staleContacts48h }] =
    await Promise.all([
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_profile_id', profileId)
        .neq('status', 'closed')
        .neq('status', 'lost'),
      supabase
        .from('leads')
        .select('budget, status')
        .eq('assigned_profile_id', profileId),
      supabase
        .from('leads')
        .select('name, ai_priority, score, last_contact')
        .eq('assigned_profile_id', profileId)
        .in('ai_priority', ['Vysoká', 'Stredná'])
        .order('ai_priority', { ascending: true })
        .limit(5),
      // Staleness reads `last_contact_at` (timestamptz), not `last_contact`
      // (free text: 'Práve vytvorený', 'Práve importovaný', occasionally an ISO
      // string). Comparing a cutoff against that text was a lexicographic
      // accident, not a date comparison.
      //
      // The created_at guard keeps a lead that arrived an hour ago out of a
      // "no reply in 48h" count. Note that nothing currently writes
      // last_contact_at — it is NULL on all 511 production rows — so today this
      // number means "no contact has ever been recorded", which is true but
      // blunt. Populating it is its own task, not something to paper over here.
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_profile_id', profileId)
        .lt('created_at', staleCutoff)
        .or(`last_contact_at.is.null,last_contact_at.lt.${staleCutoff}`),
    ])

  const pipelineValueEur = (pipelineLeads ?? [])
    .filter((row) => row.status !== 'closed' && row.status !== 'lost')
    .reduce((sum, row) => sum + parseBudgetEur(row.budget), 0)

  const pendingContact = activeLeads ?? 0
  const hotPending = hotLeads.length

  return {
    settings:  settings as BriefSettings,
    ownerName:  profile.full_name  ?? 'Maklér',
    ownerEmail: profile.email,
    hotLeads,
    overnight: { newLeads, lvChanges, arbitrage, priceDrops, replies },
    stats: {
      hotLeads: hotLeads.length,
      activeLeads: activeLeads ?? 0,
      newInquiries: newLeads,
      scoreIncreases,
      weeklyRevForecast: null,
      pendingContact,
      hotPending,
      staleContacts48h: staleContacts48h ?? 0,
      pipelineValueEur,
      priorityLeadNames: (priorityLeads ?? []).map((l) => l.name ?? 'Lead'),
      priceDropCount: priceDrops.length,
    },
  }
}
