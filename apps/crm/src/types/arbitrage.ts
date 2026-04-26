// ================================================================
// Revolis.AI — Cross-Portal Arbitrage Engine Types
// ================================================================

export type PortalSource =
  | 'nehnutelnosti_sk'
  | 'bazos_sk'
  | 'reality_sk'
  | 'byty_sk'
  | 'topreality_sk'

export type PropertyType = 'apartment' | 'house' | 'land' | 'commercial' | 'cottage' | 'other'
export type TransactionType = 'sale' | 'rent'
export type MatchStatus = 'new' | 'viewed' | 'contacted' | 'dismissed' | 'expired'
export type SellerType = 'agency' | 'private' | 'unknown'

// ── A single raw listing from any portal ─────────────────────
export interface PortalListing {
  id:              string
  profile_id:      string | null
  source:          PortalSource
  external_id:     string
  external_url:    string | null

  title:           string
  price:           number | null
  currency:        string
  price_per_m2:    number | null
  area_m2:         number | null
  rooms:           number | null
  floor:           string | null
  property_type:   PropertyType
  transaction_type: TransactionType

  street:          string | null
  city:            string | null
  district:        string | null
  region:          string | null
  postal_code:     string | null
  lat:             number | null
  lng:             number | null
  location_raw:    string | null

  location_hash:   string | null
  property_hash:   string | null

  seller_type:     SellerType
  seller_name:     string | null
  seller_phone:    string | null
  description:     string | null
  cover_photo_url: string | null

  first_seen_at:   string
  last_seen_at:    string
  last_price:      number | null
  is_active:       boolean
}

// ── A detected arbitrage match ────────────────────────────────
export interface ArbitrageMatch {
  id:               string
  profile_id:       string | null
  listing_portal:   string     // FK → portal_listings
  listing_bazos:    string     // FK → portal_listings

  price_portal:     number
  price_bazos:      number
  delta_eur:        number     // portal - bazos (positive = portal more expensive)
  delta_pct:        number

  match_score:      number     // 0.0 – 1.0 confidence
  match_reasons:    MatchReason[]

  city:             string | null
  address_display:  string | null

  price_drop_count: number
  days_on_market:   number | null
  seller_is_private: boolean

  status:           MatchStatus
  dismissed_reason: string | null
  lead_id:          string | null

  detected_at:      string
  expires_at:       string
  updated_at:       string

  // Joined from portal_listings
  portal_listing?:  PortalListing
  bazos_listing?:   PortalListing
}

export type MatchReason =
  | 'same_street'
  | 'same_area_bucket'
  | 'same_rooms'
  | 'same_type'
  | 'same_property_hash'
  | 'same_district_price_range'
  | 'similar_description'
  | 'same_photo_hash'

// ── Scan configuration ────────────────────────────────────────
export interface ArbitrageConfig {
  profile_id:        string
  enabled:           boolean
  regions:           string[]
  cities:            string[]
  min_delta_pct:     number
  min_delta_eur:     number
  min_match_score:   number
  transaction_types: TransactionType[]
  property_types:    PropertyType[]
  price_min:         number | null
  price_max:         number | null
  notify_email:      boolean
  notify_push:       boolean
  last_scan_at:      string | null
}

// ── Parsed listing from Bazoš RSS ────────────────────────────
export interface BazosRawItem {
  title:        string
  link:         string
  description:  string
  pubDate:      string
  guid:         string
  price:        number | null
  location_raw: string | null
}

// ── Parser result ─────────────────────────────────────────────
export interface ParseResult {
  listings:  Partial<PortalListing>[]
  errors:    string[]
  source:    PortalSource
  scanned_at: string
}

// ── Scan run summary ──────────────────────────────────────────
export interface ScanSummary {
  profile_id:       string
  scan_started_at:  string
  scan_finished_at: string
  listings_fetched: number
  listings_upserted: number
  matches_found:    number
  matches_new:      number
  errors:           string[]
}

// ── Stats ─────────────────────────────────────────────────────
export interface ArbitrageStats {
  total_matches:   number
  new_matches:     number
  contacted:       number
  dismissed:       number
  avg_delta_pct:   number
  avg_delta_eur:   number
  max_delta_eur:   number
  avg_match_score: number
  private_sellers: number
  last_detected_at: string | null
}
