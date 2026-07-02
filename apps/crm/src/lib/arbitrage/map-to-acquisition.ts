import type { ArbitrageCandidate } from '@/types/acquisition-hub'
import type { ArbitrageMatch } from '@/types/arbitrage'

const REASON_LABELS: Record<string, string> = {
  same_street: 'Rovnaká ulica',
  same_area_bucket: 'Rovnaká lokalita',
  same_rooms: 'Rovnaký počet izieb',
  same_type: 'Rovnaký typ nehnuteľnosti',
  same_property_hash: 'Zhoda nehnuteľnosti',
  same_district_price_range: 'Podobná cenová hladina',
  similar_description: 'Podobný popis',
  same_photo_hash: 'Podobné fotografie',
}

function formatReasons(reasons: ArbitrageMatch['match_reasons']): string {
  if (!reasons?.length) return 'Zhoda medzi portálom a Bazošom — rozdiel v cene.'
  return reasons.map((r) => REASON_LABELS[r] ?? r).join(', ')
}

function displayName(match: ArbitrageMatch): string {
  const seller =
    match.bazos_listing?.seller_name?.trim() ??
    match.portal_listing?.seller_name?.trim()
  if (seller) return seller
  if (match.address_display?.trim()) return match.address_display.trim()
  if (match.city?.trim()) return match.city.trim()
  return `Zhoda ${match.id.slice(0, 8)}`
}

function scoreFromMatch(match: ArbitrageMatch): number {
  if (match.match_score > 0) {
    return Math.round(Math.min(100, match.match_score * 100))
  }
  if (match.delta_pct > 0) {
    return Math.round(Math.min(100, match.delta_pct * 2))
  }
  return 50
}

function interestedAddress(match: ArbitrageMatch): string {
  if (match.address_display?.trim()) return match.address_display.trim()
  const portal = match.portal_listing
  const parts = [portal?.street, portal?.city ?? match.city].filter(Boolean)
  if (parts.length) return parts.join(', ')
  return portal?.title ?? 'Portálový inzerát'
}

function ownedAddress(match: ArbitrageMatch): string | undefined {
  const bazos = match.bazos_listing
  if (!bazos) return undefined
  const label = bazos.title ?? 'Bazoš inzerát'
  return `${label} — ${match.price_bazos.toLocaleString('sk-SK')} €`
}

/**
 * Map DB arbitrage match → acquisition hub candidate card.
 */
export function mapMatchToAcquisitionCandidate(match: ArbitrageMatch): ArbitrageCandidate {
  const deltaLabel = `${match.delta_eur.toLocaleString('sk-SK')} € (${match.delta_pct.toFixed(1)} %)`

  return {
    id: match.id,
    name: displayName(match),
    phone: match.bazos_listing?.seller_phone ?? undefined,
    interestedAddress: interestedAddress(match),
    ownedAddress: ownedAddress(match),
    arbitrageScore: scoreFromMatch(match),
    reasoning: formatReasons(match.match_reasons),
    recommendedAction: `Kontaktovať predajcu na Bazoši — cenový rozdiel ${deltaLabel}.`,
  }
}

export function mapMatchesToAcquisitionCandidates(
  matches: ArbitrageMatch[],
): ArbitrageCandidate[] {
  return matches.map(mapMatchToAcquisitionCandidate)
}
