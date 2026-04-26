// ================================================================
// Revolis.AI — PriceTrailPanel
// Full panel: chart + motivation score + negotiation script
// Usage: <PriceTrailPanel listingId="uuid" profileId="uuid" />
// ================================================================
'use client'
import { useState }          from 'react'
import { usePriceTrail }     from '@/hooks/use-price-trail'
import { PriceChart }        from './PriceChart'
import { MotivationBadge }   from './MotivationBadge'
import { TIER_CONFIG }       from '@/types/price-trail'
import type { NegotiationLine } from '@/types/price-trail'

interface PriceTrailPanelProps {
  profileId:   string
  listingId?:  string
  propertyId?: string
  compact?:    boolean
}

const fmt = (n: number | null | undefined) =>
  n ? n.toLocaleString('sk-SK') + ' €' : '—'

function ScriptLine({ line, index }: { line: NegotiationLine; index: number }) {
  const [open, setOpen] = useState(index === 0)
  const phaseColors = {
    opener: '#378ADD', anchor: '#EF9F27', floor: '#E24B4A', close: '#1D9E75',
  }
  const color = phaseColors[line.phase] ?? '#888780'

  return (
    <div style={{ marginBottom: 6 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          cursor: 'pointer', padding: '8px 0', display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
        <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
                       background: `${color}18`, color, flexShrink: 0, marginTop: 1 }}>
          {line.phase}
        </span>
        <span style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.5,
                       fontStyle: 'italic', flex: 1 }}>
          {line.text.slice(0, 60)}{line.text.length > 60 ? '…' : ''}
        </span>
        <span style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
          {open ? '↑' : '↓'}
        </span>
      </button>
      {open && (
        <div style={{ paddingLeft: 60, paddingBottom: 8 }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-primary)',
                      fontStyle: 'italic', margin: '0 0 6px', lineHeight: 1.6 }}>
            {line.text}
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)',
                      margin: 0, lineHeight: 1.5 }}>
            {line.context}
          </p>
        </div>
      )}
    </div>
  )
}

export function PriceTrailPanel({
  profileId, listingId, propertyId, compact = false,
}: PriceTrailPanelProps) {
  const { trail, brief, script, isLoading, isAdding, addPoint }
    = usePriceTrail({ profileId, listingId, propertyId, withScript: true })

  const [showAddForm, setShowAddForm] = useState(false)
  const [newPrice,    setNewPrice]    = useState('')
  const [newNote,     setNewNote]     = useState('')
  const [activeTab,   setActiveTab]   = useState<'chart' | 'brief' | 'script'>('chart')

  const handleAdd = async () => {
    const price = parseFloat(newPrice.replace(/\s/g, '').replace(',', '.'))
    if (isNaN(price) || price <= 0) return
    await addPoint({ price, source: 'user_input', note: newNote || undefined })
    setNewPrice('')
    setNewNote('')
    setShowAddForm(false)
  }

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center',
                    color: 'var(--color-text-tertiary)', fontSize: 14 }}>
        Načítavam históriu cien…
      </div>
    )
  }

  return (
    <div style={{
      background:   'var(--color-background-primary)',
      border:       '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      overflow:     'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px',
                    borderBottom: '0.5px solid var(--color-border-tertiary)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 500,
                      color: 'var(--color-text-primary)', margin: 0 }}>
            Cenová história
          </p>
          {brief && (
            <MotivationBadge tier={brief.motivation_tier}
                             score={brief.motivation_score} size="sm" />
          )}
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>
          + Pridať cenu
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div style={{ padding: '12px 16px',
                      background: 'var(--color-background-secondary)',
                      borderBottom: '0.5px solid var(--color-border-tertiary)',
                      display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-text-tertiary)',
                            display: 'block', marginBottom: 3 }}>Cena (€)</label>
            <input
              type="text" placeholder="159 000"
              value={newPrice}
              onChange={e => setNewPrice(e.target.value)}
              style={{ width: 120 }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 11, color: 'var(--color-text-tertiary)',
                            display: 'block', marginBottom: 3 }}>Poznámka (voliteľné)</label>
            <input
              type="text" placeholder="Predajca zvolal cenu"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={isAdding}
            style={{ background: '#0A6E8A', color: 'white', border: 'none',
                     padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            {isAdding ? 'Ukladám…' : 'Uložiť'}
          </button>
          <button onClick={() => setShowAddForm(false)}
                  style={{ fontSize: 13, padding: '8px 10px', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        {([
          { key: 'chart',  label: 'Graf' },
          { key: 'brief',  label: 'Brief' },
          { key: 'script', label: 'Skript' },
        ] as const).map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '10px', fontSize: 13, border: 'none', cursor: 'pointer',
              background: activeTab === tab.key
                ? 'var(--color-background-primary)' : 'var(--color-background-secondary)',
              color: activeTab === tab.key
                ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              borderBottom: activeTab === tab.key
                ? '2px solid var(--color-text-info)' : '2px solid transparent',
              fontWeight: activeTab === tab.key ? 500 : 400,
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: 16 }}>

        {/* CHART TAB */}
        {activeTab === 'chart' && (
          <>
            {trail.length < 2 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)',
                          textAlign: 'center', padding: '1rem 0' }}>
                Nedostatočné dáta pre graf. Pridajte aspoň 2 cenové body.
              </p>
            ) : (
              <>
                <PriceChart data={trail} width={compact ? 360 : 480} height={160} />
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Prvá cena',    value: fmt(brief?.first_price),     color: '#888780' },
                    { label: 'Aktuálna',     value: fmt(brief?.current_price),   color: 'var(--color-text-primary)' },
                    { label: 'Poklesov',     value: String(brief?.drop_count ?? 0), color: '#E24B4A' },
                    { label: 'Celkový pokles', value: fmt(brief?.total_drop_eur), color: '#E24B4A' },
                  ].map(s => (
                    <div key={s.label}
                         style={{ flex: 1, minWidth: 80,
                                  background: 'var(--color-background-secondary)',
                                  borderRadius: 8, padding: '8px 10px' }}>
                      <p style={{ fontSize: 16, fontWeight: 500, color: s.color,
                                  margin: '0 0 2px' }}>{s.value}</p>
                      <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)',
                                  margin: 0 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* BRIEF TAB */}
        {activeTab === 'brief' && brief && (
          <div>
            <div style={{ background: TIER_CONFIG[brief.motivation_tier].bg,
                          borderLeft: `3px solid ${TIER_CONFIG[brief.motivation_tier].color}`,
                          borderRadius: 6, padding: '12px 14px', marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 500,
                          color: TIER_CONFIG[brief.motivation_tier].text,
                          margin: '0 0 4px' }}>
                {TIER_CONFIG[brief.motivation_tier].icon}  {TIER_CONFIG[brief.motivation_tier].label}
              </p>
              <p style={{ fontSize: 13, color: 'var(--color-text-primary)',
                          margin: 0, lineHeight: 1.6 }}>
                {brief.motivation_brief}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Dni na trhu',      value: `${brief.days_on_market ?? '—'} dní` },
                { label: 'Posledný pokles',  value: brief.days_since_last_drop !== null ? `pred ${brief.days_since_last_drop} dňami` : '—' },
                { label: 'Odhadovaný floor', value: fmt(brief.estimated_floor) },
                { label: 'Vyjednávací rozsah', value: fmt(brief.negotiation_range) },
              ].map(item => (
                <div key={item.label}
                     style={{ background: 'var(--color-background-secondary)',
                              borderRadius: 8, padding: '10px 12px' }}>
                  <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)',
                              margin: '0 0 3px' }}>{item.label}</p>
                  <p style={{ fontSize: 15, fontWeight: 500,
                              color: 'var(--color-text-primary)', margin: 0 }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCRIPT TAB */}
        {activeTab === 'script' && (
          script.length > 0 ? (
            <div>
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)',
                          marginBottom: 10, lineHeight: 1.5 }}>
                Vyjednávací skript generovaný z cenovej histórie. Kliknite na fázu pre detail.
              </p>
              {script.map((line, i) => (
                <ScriptLine key={i} line={line} index={i} />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)',
                        textAlign: 'center', padding: '1rem 0' }}>
              Skript bude dostupný po pridaní aspoň 1 cenového bodu.
            </p>
          )
        )}
      </div>
    </div>
  )
}
