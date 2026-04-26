// ================================================================
// Revolis.AI — Historical Price Trail Types
// ================================================================

export type MotivationTier = 'urgent' | 'high' | 'medium' | 'low' | 'unknown'
export type PriceSource    = 'manual' | 'portal_import' | 'admin_export' |
                             'bazos_rss' | 'xml_feed' | 'user_input' | 'estimated'
export type WatchType      = 'any_drop' | 'drop_threshold' | 'target_price' | 'relisted'

// ── A single price point in the trail ────────────────────────
export interface PricePoint {
  id:           string
  profile_id:   string
  listing_id:   string | null
  property_id:  string | null
  lead_id:      string | null
  price:        number
  currency:     string
  price_per_m2: number | null
  source:       PriceSource
  recorded_at:  string
  prev_price:   number | null
  delta_eur:    number | null   // negative = price dropped
  delta_pct:    number | null
  is_drop:      boolean
  note:         string | null
  internal_only: boolean
}

// ── Computed seller motivation ────────────────────────────────
export interface SellerMotivation {
  motivation_score:      number       // 0–100
  motivation_tier:       MotivationTier
  drop_count:            number
  total_drop_eur:        number
  total_drop_pct:        number       // e.g. 12.5 = 12.5%
  days_on_market:        number | null
  days_since_last_drop:  number | null
  price_velocity:        number | null  // EUR/day, negative = dropping
  listing_count:         number        // >1 = relisted
  first_price:           number | null
  current_price:         number | null
  estimated_floor:       number | null
  negotiation_range:     number | null
  best_offer_window:     string | null
  computed_at:           string
  trail_start_at:        string | null
}

// ── Negotiation brief (from view) ─────────────────────────────
export interface NegotiationBrief extends SellerMotivation {
  listing_id:      string | null
  property_id:     string | null
  motivation_brief: string          // human-readable SQL-generated text
  listing_title:   string | null
  city:            string | null
  street:          string | null
  area_m2:         number | null
  rooms:           number | null
  cover_photo_url: string | null
  portal_url:      string | null
}

// ── Price alert watch ─────────────────────────────────────────
export interface PriceAlert {
  id:               string
  profile_id:       string
  listing_id:       string | null
  property_id:      string | null
  lead_id:          string | null
  watch_type:       WatchType
  threshold_eur:    number | null
  target_price:     number | null
  notify_email:     boolean
  notify_push:      boolean
  is_active:        boolean
  last_triggered_at: string | null
  trigger_count:    number
  created_at:       string
}

// ── add_price_point result ────────────────────────────────────
export interface AddPricePointResult {
  point_id:  string
  price:     number
  prev_price: number | null
  delta_eur: number | null
  delta_pct: number | null
  is_drop:   boolean
  motivation: SellerMotivation
}

// ── UI chart data point ───────────────────────────────────────
export interface ChartPoint {
  date:       string        // ISO date string for x-axis
  price:      number        // for y-axis
  is_drop:    boolean
  delta_eur:  number | null
  delta_pct:  number | null
  note:       string | null
  source:     PriceSource
}

// ── Motivation tier design tokens ─────────────────────────────
export const TIER_CONFIG: Record<MotivationTier, {
  color: string; bg: string; text: string; label: string; icon: string
}> = {
  urgent:  { color:'#E24B4A', bg:'#FCEBEB', text:'#791F1F', label:'Urgentne motivovaný', icon:'🔥' },
  high:    { color:'#EF9F27', bg:'#FAEEDA', text:'#633806', label:'Vysoká motivácia',    icon:'📈' },
  medium:  { color:'#378ADD', bg:'#E6F1FB', text:'#0C447C', label:'Stredná motivácia',   icon:'📊' },
  low:     { color:'#888780', bg:'#F1EFE8', text:'#444441', label:'Nízka motivácia',     icon:'📋' },
  unknown: { color:'#B4B2A9', bg:'#F1EFE8', text:'#5F5E5A', label:'Nedostatok dát',     icon:'❓' },
}

// ── Negotiation script lines (used in NegotiationScript component)
export interface NegotiationLine {
  phase:   'opener' | 'anchor' | 'floor' | 'close'
  text:    string
  context: string   // why this line is effective
}
