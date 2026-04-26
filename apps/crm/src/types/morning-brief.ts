// ================================================================
// Revolis.AI — Morning Brief Types
// ================================================================

export type BriefChannel = 'email' | 'push' | 'whatsapp'
export type BriefVariant = 'A' | 'B'
  // A = 3 sentences, ultra-concise
  // B = full briefing with context paragraphs

export interface BriefSettings {
  profile_id:          string
  enabled:             boolean
  delivery_hour_utc:   number
  delivery_minute_utc: number
  channels:            BriefChannel[]
  language:            'sk' | 'cs' | 'en'
  lead_count:          number
  include_lv_changes:  boolean
  include_arbitrage:   boolean
  include_price_drops: boolean
  include_team_stats:  boolean
  a_b_variant:         BriefVariant
  push_subscription:   PushSubscriptionJSON | null
  updated_at:          string
}

export interface PushSubscriptionJSON {
  endpoint: string
  expirationTime: number | null
  keys: { p256dh: string; auth: string }
}

// ── The core brief data structure ────────────────────────────
export interface MorningBriefData {
  briefId:         string
  profileId:       string
  generatedAt:     string

  // The "top lead" — star of the brief
  topLead: {
    id:         string
    name:       string
    score:      number
    trajectory: string
    reason:     string           // why they are #1 today
    lastAction: string           // what triggered the score
    phone:      string | null
    email:      string | null
    property:   string | null    // nehnuteľnosť o ktorú sa zaujíma
  }

  // Overnight activity digest
  overnight: {
    totalChanges:  number
    newLeads:      number
    lvChanges:     OvernightLVChange[]
    arbitrage:     OvernightArbitrage[]
    priceDrops:    OvernightPriceDrop[]
    replies:       OvernightReply[]
  }

  // The ONE recommended action — specific, not generic
  action: {
    verb:       string           // "Zavolajte", "Pošlite", "Navštívte"
    target:     string           // name of lead or property
    context:    string           // why now, backed by data
    deepLink:   string           // direct URL to the lead in Revolis
    urgency:    'high' | 'medium' | 'low'
  }

  // Team snapshot (owners only)
  team?: {
    activeMacléri:   number
    topMacler:       string
    topMaclerDeals:  number
    pipelineTotal:   number
  }

  // Performance stats
  stats: {
    hotLeads:       number
    activeLeads:    number
    newInquiries:   number
    scoreIncreases: number
    weeklyRevForecast: number | null
  }

  // AI-generated text (2–5 sentences depending on variant)
  aiText:       string
  subjectLine:  string
  variant:      BriefVariant
}

// Overnight change types
export interface OvernightLVChange {
  parcelId:    string
  address:     string
  changeType:  'plomba' | 'owner_change' | 'new_burden' | 'unknown'
  leadId:      string | null
  leadName:    string | null
}

export interface OvernightArbitrage {
  address:     string
  portalPrice: number
  bazosPrice:  number
  delta:       number
  deltaPct:    number
  propertyId:  string
}

export interface OvernightPriceDrop {
  address:     string
  oldPrice:    number
  newPrice:    number
  dropPct:     number
  dropCount:   number   // how many times dropped total
  propertyId:  string
}

export interface OvernightReply {
  leadId:      string
  leadName:    string
  repliedAt:   string
  messagePreview: string
}

// ── Brief log record (from DB) ────────────────────────────────
export interface MorningBriefRecord {
  id:              string
  profile_id:      string
  generated_at:    string
  delivered_at:    string | null
  opened_at:       string | null
  clicked_at:      string | null
  top_lead_id:     string | null
  top_lead_score:  number | null
  brief_text:      string | null
  action_text:     string | null
  overnight_count: number
  channel:         BriefChannel
  a_b_variant:     BriefVariant
  subject_line:    string | null
  new_leads_count: number
  lv_changes_count: number
  arbitrage_count: number
  hot_leads_count: number
}

// ── Stats view ────────────────────────────────────────────────
export interface BriefWeekStats {
  week:                string
  briefs_sent:         number
  opened:              number
  clicked:             number
  open_rate_pct:       number
  click_rate_pct:      number
  avg_top_lead_score:  number
}
