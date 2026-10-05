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
    /**
     * Active leads with NO recorded contact — the honest reading of
     * "waiting to be contacted".
     *
     * `null` means not measurable, and is not the same as `0`. It used to be
     * `activeLeads`, i.e. the broker's entire active book, so the brief's
     * headline action said 100% of leads were waiting no matter what had
     * happened. Measured on production 2026-10-02: every one of the five
     * largest assignees had active == pendingContact exactly
     * (142, 72, 66, 47, 39). That is the same defect as staleContacts48h
     * before #735 and as last_contact_at before #800 — a number that reads
     * like a measurement but is a restatement of the row count.
     *
     * Reported as `null` while the broker has no contact trail at all,
     * because "nobody has contacted them" cannot then be told apart from
     * "we do not record contacts". Once anything stamps `last_contact_at`
     * (the writer landed in #800) the count starts reporting for real with
     * no further code change.
     */
    pendingContact: number | null
    /**
     * Hot leads with no recorded contact. Same `null` rule.
     *
     * Was `hotLeads.length` — a duplicate of `stats.hotLeads` under a name
     * that claimed it was the hot subset of those waiting. The brief printed
     * it as "(z toho HOT: N)", which made the claim explicit and false.
     */
    hotPending: number | null
    /**
     * Leads that WERE contacted and then went quiet for STALE_HOURS.
     *
     * `null` means not measurable, and is not the same as `0`. Nothing writes
     * `leads.last_contact_at` yet (NULL on all 511 production rows), so for a
     * broker whose leads carry no contact timestamp at all there is no honest
     * count to give. Rendering `0` there would claim "nothing is stale";
     * rendering the row count would claim every lead is. Both are false.
     */
    staleContacts48h: number | null
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
  const hotLeadIds = hotLeads.map((l) => l.lead_id).filter((id): id is string => !!id)

  const [
    { count: activeLeads },
    { data: pipelineLeads },
    { data: priorityLeads },
    { count: contactedCount, error: contactedErr },
    { count: staleCount, error: staleErr },
    { count: pendingCount, error: pendingErr },
  ] =
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
      // Two queries, because "is this measurable at all" and "what is the
      // count" are different questions and only the first one can be answered
      // today. `last_contact_at` is NULL on all 511 production rows, so the
      // denominator query returns 0 and the count is reported as `null`.
      //
      // The previous shape included `last_contact_at IS NULL` in the staleness
      // test. That conflated "we contacted them and they went quiet" with "no
      // one has ever contacted them" — and since the column is empty, the
      // disjunct matched every row. Measured on production before this change:
      // the count equalled the broker's entire book, exactly, for all five
      // largest assignees (142/142, 72/72, 66/66, 47/47, 39/39). A false 100%
      // reached the brief as the recommended action of the day
      // ("Najprv kontaktujte 142 leadov bez odpovede >48h").
      //
      // This shape heals itself: the first time anything writes
      // `last_contact_at`, `contactedCount` goes above zero and the number
      // starts reporting for real, with no further code change.
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_profile_id', profileId)
        .not('last_contact_at', 'is', null),
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_profile_id', profileId)
        .not('last_contact_at', 'is', null)
        .lt('last_contact_at', staleCutoff),
      // "Waiting to be contacted" = active lead with no recorded contact.
      // Same shape as the staleness pair above, and for the same reason: the
      // measurability question and the count are different questions. This
      // replaces `pendingContact = activeLeads`, which restated the row count
      // and therefore always read 100%.
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_profile_id', profileId)
        .neq('status', 'closed')
        .neq('status', 'lost')
        .is('last_contact_at', null),
    ])

  const pipelineValueEur = (pipelineLeads ?? [])
    .filter((row) => row.status !== 'closed' && row.status !== 'lost')
    .reduce((sum, row) => sum + parseBudgetEur(row.budget), 0)

  // A query error means "we do not know", never "zero". `?? 0` on a rejected
  // query is exactly the bug #727 had to undo on four other counts; it must not
  // be reintroduced here under a nicer name.
  if (contactedErr) console.error('[gather] contacted-count error', contactedErr.message)
  if (staleErr) console.error('[gather] stale-count error', staleErr.message)
  if (pendingErr) console.error('[gather] pending-contact-count error', pendingErr.message)

  // One gate for every number derived from the contact trail: does this broker
  // have ANY recorded contact at all? Until the answer is yes, "nobody has
  // contacted this lead" is indistinguishable from "we do not record
  // contacts", and both pendingContact and staleContacts48h are unmeasurable.
  // Measured on production 2026-10-02: zero for every assignee, so both read
  // `null` today and start reporting on their own once #800's writer fires.
  const contactTrailExists =
    !contactedErr && contactedCount !== null && (contactedCount ?? 0) > 0

  const staleContacts48h: number | null =
    !contactTrailExists || staleErr ? null : staleCount ?? null

  const pendingContact: number | null =
    !contactTrailExists || pendingErr ? null : pendingCount ?? null

  // Hot leads with no recorded contact. Scoped by the ids we already hold, so
  // this costs nothing when the broker has no hot leads and needs no change to
  // the BRI engine's select.
  let hotPending: number | null = null
  if (contactTrailExists) {
    if (hotLeadIds.length === 0) {
      hotPending = 0
    } else {
      const { count: hotPendingCount, error: hotPendingErr } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .in('id', hotLeadIds)
        .is('last_contact_at', null)
      if (hotPendingErr) console.error('[gather] hot-pending-count error', hotPendingErr.message)
      hotPending = hotPendingErr ? null : hotPendingCount ?? null
    }
  }

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
      staleContacts48h,
      pipelineValueEur,
      priorityLeadNames: (priorityLeads ?? []).map((l) => l.name ?? 'Lead'),
      priceDropCount: priceDrops.length,
    },
  }
}
