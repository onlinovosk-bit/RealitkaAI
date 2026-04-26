// ================================================================
// Revolis.AI — ArbitrageCard
// Displays a single cross-portal arbitrage opportunity
// ================================================================
'use client'
import type { ArbitrageMatch, MatchReason } from '@/types/arbitrage'

interface ArbitrageCardProps {
  match:         ArbitrageMatch
  onContact:     (match: ArbitrageMatch) => void
  onDismiss:     (match: ArbitrageMatch) => void
  onViewPortal:  (match: ArbitrageMatch) => void
}

const REASON_LABELS: Record<MatchReason, string> = {
  same_property_hash:      'Identická nehnuteľnosť',
  same_street:             'Rovnaká ulica',
  same_area_bucket:        'Rovnaká plocha',
  same_rooms:              'Rovnaký počet izieb',
  same_type:               'Rovnaký typ',
  same_district_price_range: 'Rovnaká cenová hladina',
  similar_description:     'Podobný popis',
  same_photo_hash:         'Rovnaké fotografie',
}

function ConfidencePill({ score }: { score: number }) {
  const pct  = Math.round(score * 100)
  const bg   = pct >= 80 ? '#E1F5EE' : pct >= 65 ? '#FAEEDA' : '#F1EFE8'
  const col  = pct >= 80 ? '#085041' : pct >= 65 ? '#633806' : '#444441'
  return (
    <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px',
                   borderRadius: 20, background: bg, color: col }}>
      {pct}% zhoda
    </span>
  )
}

function DeltaBadge({ eur, pct }: { eur: number; pct: number }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <p style={{ fontSize: 22, fontWeight: 500, color: '#1D9E75',
                  margin: '0 0 2px', lineHeight: 1 }}>
        +{eur.toLocaleString('sk-SK')} €
      </p>
      <p style={{ fontSize: 12, color: '#0F6E56', margin: 0 }}>
        ({pct}% rozdiel)
      </p>
    </div>
  )
}

export function ArbitrageCard({
  match, onContact, onDismiss, onViewPortal,
}: ArbitrageCardProps) {
  const portal = (match as any).portal_listing
  const bazos  = (match as any).bazos_listing

  const isHighPriority = match.delta_pct >= 15 || match.seller_is_private
  const borderColor    = isHighPriority ? '#1D9E75' : 'var(--color-border-tertiary)'
  const topBg          = isHighPriority ? '#E1F5EE18' : 'var(--color-background-secondary)'

  return (
    <div style={{
      background:   'var(--color-background-primary)',
      border:       `0.5px solid ${borderColor}`,
      borderRadius: 'var(--border-radius-lg)',
      overflow:     'hidden',
      marginBottom: 8,
    }}>
      {/* Header */}
      <div style={{ background: topBg, padding: '12px 16px',
                    borderBottom: '0.5px solid var(--color-border-tertiary)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <ConfidencePill score={match.match_score} />
            {match.seller_is_private && (
              <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px',
                             borderRadius: 20, background: '#E6F1FB', color: '#0C447C' }}>
                súkromný predaj
              </span>
            )}
            {match.price_drop_count > 0 && (
              <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px',
                             borderRadius: 20, background: '#FCEBEB', color: '#791F1F' }}>
                ↓ {match.price_drop_count}× znížená
              </span>
            )}
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)',
                      margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {match.address_display ?? match.city}
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '2px 0 0' }}>
            {match.city}
            {(portal?.area_m2 || portal?.rooms) && (
              <> · {portal.rooms ? `${portal.rooms}-izb.` : ''} {portal.area_m2 ? `${portal.area_m2}m²` : ''}</>
            )}
          </p>
        </div>
        <DeltaBadge eur={match.delta_eur} pct={match.delta_pct} />
      </div>

      {/* Price comparison row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                    gap: 8, padding: '12px 16px', alignItems: 'center' }}>
        <div style={{ background: 'var(--color-background-secondary)',
                      borderRadius: 8, padding: '8px 12px' }}>
          <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)',
                      textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 2px' }}>
            Portál
          </p>
          <p style={{ fontSize: 16, fontWeight: 500,
                      color: 'var(--color-text-primary)', margin: 0 }}>
            {match.price_portal.toLocaleString('sk-SK')} €
          </p>
          <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)', margin: '2px 0 0' }}>
            nehnutelnosti.sk
          </p>
        </div>

        <div style={{ fontSize: 18, color: 'var(--color-text-tertiary)',
                      textAlign: 'center', lineHeight: 1 }}>
          vs
        </div>

        <div style={{ background: '#E1F5EE', borderRadius: 8, padding: '8px 12px' }}>
          <p style={{ fontSize: 10, color: '#085041',
                      textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 2px' }}>
            Bazoš
          </p>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#0F6E56', margin: 0 }}>
            {match.price_bazos.toLocaleString('sk-SK')} €
          </p>
          <p style={{ fontSize: 10, color: '#0F6E56', margin: '2px 0 0' }}>
            {bazos?.seller_phone ?? 'súkromný'}
          </p>
        </div>
      </div>

      {/* Match reasons */}
      <div style={{ padding: '0 16px 10px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {match.match_reasons.slice(0, 4).map(r => (
          <span key={r} style={{ fontSize: 10, color: 'var(--color-text-tertiary)',
                                 background: 'var(--color-background-tertiary)',
                                 padding: '2px 6px', borderRadius: 4 }}>
            {REASON_LABELS[r] ?? r}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 14px' }}>
        <button
          onClick={() => onContact(match)}
          style={{ flex: 1, background: '#0A6E8A', color: 'white', border: 'none',
                   borderRadius: 8, padding: '9px 0', fontSize: 13, fontWeight: 500,
                   cursor: 'pointer' }}>
          Kontaktovať predajcu
        </button>
        <button
          onClick={() => onViewPortal(match)}
          style={{ padding: '9px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
          Portál →
        </button>
        <button
          onClick={() => onDismiss(match)}
          style={{ padding: '9px 12px', borderRadius: 8, fontSize: 12,
                   color: 'var(--color-text-tertiary)', cursor: 'pointer' }}>
          ✕
        </button>
      </div>
    </div>
  )
}
