// ================================================================
// Revolis.AI — ArbitrageDashboard
// Full arbitrage section for owner/agent dashboard
// Usage: <ArbitrageDashboard profileId="uuid" />
// ================================================================
'use client'
import { useState }           from 'react'
import { useArbitrage }       from '@/hooks/use-arbitrage'
import { ArbitrageCard }      from './ArbitrageCard'
import type { ArbitrageMatch } from '@/types/arbitrage'

interface ArbitrageDashboardProps {
  profileId: string
}

export function ArbitrageDashboard({ profileId }: ArbitrageDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<'new' | 'viewed' | 'contacted'>('new')

  const { matches, stats, isLoading, isMutating,
          newCount, refresh, updateStatus } = useArbitrage({
    profileId,
    status:      activeFilter,
    limit:       30,
    autoRefresh: true,
  })

  const handleContact = async (match: ArbitrageMatch) => {
    await updateStatus(match.id, 'contacted')
    // Open Bazoš listing in new tab
    const bazos = (match as any).bazos_listing
    if (bazos?.external_url) window.open(bazos.external_url, '_blank')
  }

  const handleDismiss = async (match: ArbitrageMatch) => {
    await updateStatus(match.id, 'dismissed', 'Manuálne zamietnuté')
  }

  const handleViewPortal = (match: ArbitrageMatch) => {
    const portal = (match as any).portal_listing
    if (portal?.external_url) window.open(portal.external_url, '_blank')
  }

  return (
    <div>
      {/* Stats row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
                      gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Nové príl.',     value: stats.new_matches,   color: '#1D9E75' },
            { label: 'Ø delta',        value: `${stats.avg_delta_pct}%`, color: '#EF9F27' },
            { label: 'Max. delta',     value: `${stats.max_delta_eur?.toLocaleString('sk-SK')} €`, color: '#534AB7' },
            { label: 'Súkromní pred.', value: stats.private_sellers, color: '#378ADD' },
          ].map(s => (
            <div key={s.label}
                 style={{ background: 'var(--color-background-secondary)',
                          borderRadius: 'var(--border-radius-md)', padding: '10px 12px' }}>
              <p style={{ fontSize: 18, fontWeight: 500,
                          color: s.color, margin: '0 0 2px' }}>{s.value}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {([
          { key: 'new',       label: `Nové${newCount > 0 ? ` (${newCount})` : ''}` },
          { key: 'viewed',    label: 'Pozreté' },
          { key: 'contacted', label: 'Kontaktované' },
        ] as const).map(tab => (
          <button key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            style={{
              fontSize: 13, padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
              background: activeFilter === tab.key
                ? 'var(--color-background-info)' : 'var(--color-background-secondary)',
              color: activeFilter === tab.key
                ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
              border: activeFilter === tab.key
                ? '1px solid var(--color-border-info)'
                : '0.5px solid var(--color-border-tertiary)',
              fontWeight: activeFilter === tab.key ? 500 : 400,
            }}>
            {tab.label}
          </button>
        ))}
        <button onClick={refresh}
                style={{ marginLeft: 'auto', fontSize: 12, padding: '6px 12px',
                         borderRadius: 20, cursor: 'pointer' }}>
          ↻ Obnoviť
        </button>
      </div>

      {/* Match list */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem',
                      color: 'var(--color-text-tertiary)', fontSize: 14 }}>
          Načítavam…
        </div>
      ) : matches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem',
                      background: 'var(--color-background-secondary)',
                      borderRadius: 'var(--border-radius-lg)' }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>
            {activeFilter === 'new'
              ? 'Žiadne nové arbitrážne príležitosti'
              : `Žiadne ${activeFilter === 'viewed' ? 'pozreté' : 'kontaktované'} záznamy`}
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>
            Ďalší sken prebehne automaticky každých 6 hodín
          </p>
        </div>
      ) : (
        <div>
          {matches.map(match => (
            <ArbitrageCard
              key={match.id}
              match={match}
              onContact={handleContact}
              onDismiss={handleDismiss}
              onViewPortal={handleViewPortal}
            />
          ))}
        </div>
      )}
    </div>
  )
}
