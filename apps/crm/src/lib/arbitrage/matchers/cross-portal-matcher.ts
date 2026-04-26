// ================================================================
// Revolis.AI — Cross-Portal Matcher
// The core algorithm: finds same property on two portals
// ================================================================
import { areaBucket, roomsBucket } from '../normalise'
import type {
  PortalListing, ArbitrageMatch, MatchReason, ArbitrageConfig,
} from '@/types/arbitrage'

export interface MatchCandidate {
  portal:      PortalListing
  bazos:       PortalListing
  score:       number
  reasons:     MatchReason[]
  delta_eur:   number
  delta_pct:   number
}

// ── Main matching function ────────────────────────────────────
export function findMatches(
  portalListings: PortalListing[],
  bazosListings:  PortalListing[],
  config:         Pick<ArbitrageConfig,
    'min_delta_pct' | 'min_delta_eur' | 'min_match_score'>
): MatchCandidate[] {
  const candidates: MatchCandidate[] = []

  // Index Bazoš listings by property_hash for fast lookup
  const bazosHashIndex = new Map<string, PortalListing[]>()
  const bazosLocationIndex = new Map<string, PortalListing[]>()

  for (const b of bazosListings) {
    if (!b.price || !b.is_active) continue

    if (b.property_hash) {
      const arr = bazosHashIndex.get(b.property_hash) ?? []
      arr.push(b)
      bazosHashIndex.set(b.property_hash, arr)
    }
    if (b.location_hash) {
      const arr = bazosLocationIndex.get(b.location_hash) ?? []
      arr.push(b)
      bazosLocationIndex.set(b.location_hash, arr)
    }
  }

  for (const portal of portalListings) {
    if (!portal.price || !portal.is_active) continue

    const candidatesForPortal: PortalListing[] = []

    // Pass 1: exact property hash match (highest confidence)
    if (portal.property_hash) {
      const exact = bazosHashIndex.get(portal.property_hash) ?? []
      candidatesForPortal.push(...exact)
    }

    // Pass 2: same location, check area + rooms separately
    if (portal.location_hash) {
      const byLocation = bazosLocationIndex.get(portal.location_hash) ?? []
      for (const b of byLocation) {
        if (!candidatesForPortal.includes(b)) {
          candidatesForPortal.push(b)
        }
      }
    }

    for (const bazos of candidatesForPortal) {
      // Skip same source or invalid prices
      if (bazos.source === portal.source) continue
      if (!bazos.price || bazos.price <= 0 || portal.price <= 0) continue

      const result = scoreMatch(portal, bazos)
      if (result.score < config.min_match_score) continue

      const delta_eur = portal.price - bazos.price
      const delta_pct = (delta_eur / portal.price) * 100

      // Only surface matches where portal is MORE expensive than Bazoš
      // (Arbitrage = buy privately, list through agency at premium)
      if (delta_eur < config.min_delta_eur) continue
      if (delta_pct < config.min_delta_pct) continue

      candidates.push({
        portal,
        bazos,
        score:     result.score,
        reasons:   result.reasons,
        delta_eur: Math.round(delta_eur),
        delta_pct: Math.round(delta_pct * 10) / 10,
      })
    }
  }

  // Sort by delta_eur DESC (biggest opportunity first)
  return candidates.sort((a, b) => b.delta_eur - a.delta_eur)
}

// ── Scoring algorithm ─────────────────────────────────────────
interface ScoreResult { score: number; reasons: MatchReason[] }

function scoreMatch(a: PortalListing, b: PortalListing): ScoreResult {
  let score   = 0.0
  const reasons: MatchReason[] = []

  // ── TIER 1: identical property hash = very high confidence ──
  if (a.property_hash && b.property_hash && a.property_hash === b.property_hash) {
    score += 0.70
    reasons.push('same_property_hash')
    // No need to check individual fields — hash already covers them
    return { score: Math.min(1.0, score), reasons }
  }

  // ── TIER 2: field-by-field scoring ───────────────────────────

  // City match (required — no cross-city arbitrage)
  if (!a.city || !b.city || a.city !== b.city) {
    return { score: 0, reasons: [] }  // hard fail
  }

  // Street match (strong signal)
  if (a.street && b.street && a.street.length > 3) {
    if (a.street === b.street) {
      score += 0.30
      reasons.push('same_street')
    } else if (
      a.street.split(' ')[0] === b.street.split(' ')[0] &&
      a.street.split(' ')[0].length > 4
    ) {
      // Same street name, possibly different number format
      score += 0.20
      reasons.push('same_street')
    }
  }

  // Area match ±5m² bucket
  if (a.area_m2 && b.area_m2) {
    if (areaBucket(a.area_m2) === areaBucket(b.area_m2)) {
      score += 0.25
      reasons.push('same_area_bucket')
    } else if (Math.abs(a.area_m2 - b.area_m2) <= 10) {
      // Within 10m² — possible listing discrepancy
      score += 0.12
      reasons.push('same_area_bucket')
    }
  }

  // Rooms match
  if (a.rooms && b.rooms) {
    if (roomsBucket(a.rooms) === roomsBucket(b.rooms)) {
      score += 0.20
      reasons.push('same_rooms')
    }
  }

  // Property type match
  if (a.property_type && b.property_type && a.property_type === b.property_type) {
    score += 0.15
    reasons.push('same_type')
  }

  // Price range sanity check: Bazoš price shouldn't be >50% lower
  // (if it is, it's probably a different property)
  if (a.price && b.price) {
    const ratio = b.price / a.price
    if (ratio < 0.40) return { score: 0, reasons: [] }  // too large gap = different property
    if (ratio >= 0.75) score += 0.10                    // plausible range bonus
  }

  return { score: Math.min(1.0, score), reasons }
}
