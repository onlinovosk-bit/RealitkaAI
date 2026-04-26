// ================================================================
// Revolis.AI — BRILiveScore
// "Skóre ktoré dýcha" — the main live BRI component
//
// Variants:
//   ring   — animated SVG ring, ideal for lead cards
//   panel  — full panel with history chart and factors
//   badge  — compact pill for table rows
//   mini   — number-only for tight spaces
//
// Usage:
//   <BRILiveScore leadId="uuid" profileId="uuid" variant="ring" />
// ================================================================
'use client'
import { useState }        from 'react'
import { useBRILive }      from '@/hooks/use-bri-live'
import { BRISparkline }    from './BRISparkline'
import { BRIFactorBar }    from './BRIFactorBar'
import {
  BRI_TIER_COLORS,
  type BRITrajectory,
} from '@/types/bri'

export type BRIVariant = 'ring' | 'panel' | 'badge' | 'mini'

interface BRILiveScoreProps {
  leadId:     string
  profileId:  string
  variant?:   BRIVariant
  size?:      'sm' | 'md' | 'lg'
  className?: string
}

// ── Trajectory arrow SVG ─────────────────────────────────────
function TrajectoryArrow({ t, size = 14 }: { t: BRITrajectory; size?: number }) {
  const paths: Record<BRITrajectory, string> = {
    rising:  'M4 10L8 4L12 10',
    falling: 'M4 4L8 10L12 4',
    stable:  'M3 7H13',
    dormant: 'M5 7H11',
  }
  const colors: Record<BRITrajectory, string> = {
    rising:  '#1D9E75',
    falling: '#E24B4A',
    stable:  '#888780',
    dormant: '#B4B2A9',
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 14" fill="none"
         aria-label={`Trajectory: ${t}`}>
      <path d={paths[t]} stroke={colors[t]} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Ring variant ──────────────────────────────────────────────
function RingVariant({
  score, isPulsing, trajectory, colorTier, delta, size
}: {
  score: number; isPulsing: boolean; trajectory: BRITrajectory
  colorTier: ReturnType<typeof import('@/types/bri').getBRIColorTier>
  delta: number; size: 'sm' | 'md' | 'lg'
}) {
  const cfg      = { sm: { d: 48, sw: 4, tf: 13, sf: 10 },
                     md: { d: 68, sw: 5, tf: 18, sf: 11 },
                     lg: { d: 88, sw: 6, tf: 24, sf: 12 } }[size]
  const colors   = BRI_TIER_COLORS[colorTier]
  const radius   = (cfg.d - cfg.sw * 2) / 2
  const circ     = 2 * Math.PI * radius
  const offset   = circ - (Math.max(0, Math.min(100, score)) / 100) * circ
  const cx = cfg.d / 2
  const cy = cfg.d / 2

  return (
    <div style={{ position: 'relative', display: 'inline-flex',
                  flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        position:    'relative',
        width:  cfg.d, height: cfg.d,
        borderRadius: '50%',
        outline:  isPulsing ? `3px solid ${colors.stroke}50` : '3px solid transparent',
        transition: 'outline 0.4s ease',
      }}>
        <svg width={cfg.d} height={cfg.d}
             style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle cx={cx} cy={cy} r={radius} fill="none"
                  stroke="var(--color-border-tertiary)" strokeWidth={cfg.sw} />
          <circle cx={cx} cy={cy} r={radius} fill="none"
                  stroke={colors.stroke} strokeWidth={cfg.sw}
                  strokeDasharray={`${circ.toFixed(2)} ${circ.toFixed(2)}`}
                  strokeDashoffset={offset.toFixed(2)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1),' +
                                        'stroke 0.4s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex',
                      flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: cfg.tf, fontWeight: 500,
                         color: 'var(--color-text-primary)', lineHeight: 1 }}>
            {score}
          </span>
          <span style={{ fontSize: cfg.sf, color: 'var(--color-text-tertiary)', lineHeight: 1 }}>
            BRI
          </span>
        </div>
      </div>
      {/* Trajectory + delta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <TrajectoryArrow t={trajectory} size={12} />
        {delta !== 0 && (
          <span style={{
            fontSize: 10, fontWeight: 500,
            color:      delta > 0 ? '#085041'   : '#791F1F',
            background: delta > 0 ? '#E1F5EE'   : '#FCEBEB',
            padding:    '1px 5px',
            borderRadius: 10,
          }}>
            {delta > 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Badge variant ─────────────────────────────────────────────
function BadgeVariant({ score, colorTier, trajectory }: {
  score: number
  colorTier: ReturnType<typeof import('@/types/bri').getBRIColorTier>
  trajectory: BRITrajectory
}) {
  const colors = BRI_TIER_COLORS[colorTier]
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: colors.fill, borderRadius: 20,
                  padding: '3px 10px', border: `0.5px solid ${colors.stroke}40` }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>
        {score}
      </span>
      <TrajectoryArrow t={trajectory} size={11} />
    </div>
  )
}

// ── Mini variant ──────────────────────────────────────────────
function MiniVariant({ score, colorTier }: {
  score: number
  colorTier: ReturnType<typeof import('@/types/bri').getBRIColorTier>
}) {
  const colors = BRI_TIER_COLORS[colorTier]
  return (
    <span style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>
      {score}
    </span>
  )
}

// ── Panel variant (full detail) ───────────────────────────────
function PanelVariant({
  leadId, profileId, score, isPulsing, trajectory, colorTier,
  delta, velocity, factors, history, lastUpdated, recompute,
}: ReturnType<typeof useBRILive> & { leadId: string; profileId: string }) {
  const [showFactors, setShowFactors] = useState(false)
  const colors = BRI_TIER_COLORS[colorTier]

  return (
    <div style={{ background: 'var(--color-background-primary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 'var(--border-radius-lg)', padding: '16px 20px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '.08em',
                      textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
                      margin: '0 0 4px' }}>
            BRI Live Score
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 40, fontWeight: 500,
                           color: colors.stroke, lineHeight: 1,
                           transition: 'color 0.4s ease' }}>
              {score}
            </span>
            <span style={{ fontSize: 16, color: 'var(--color-text-tertiary)' }}>/100</span>
            <TrajectoryArrow t={trajectory} size={18} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)',
                      margin: '4px 0 0' }}>
            {colors.label}
            {delta !== 0 && (
              <span style={{ color: delta > 0 ? '#1D9E75' : '#E24B4A', marginLeft: 6 }}>
                {delta > 0 ? '+' : ''}{delta} za 24h
              </span>
            )}
          </p>
        </div>
        <RingVariant score={score} isPulsing={isPulsing} trajectory={trajectory}
                     colorTier={colorTier} delta={0} size="lg" />
      </div>

      {/* Sparkline history */}
      {history.length > 1 && (
        <div style={{ marginBottom: 14 }}>
          <BRISparkline data={history} height={48} color={colors.stroke} />
        </div>
      )}

      {/* Factor bars toggle */}
      <button
        onClick={() => setShowFactors(v => !v)}
        style={{ fontSize: 12, color: 'var(--color-text-secondary)',
                 background: 'none', border: 'none', cursor: 'pointer',
                 padding: 0, marginBottom: 8 }}>
        {showFactors ? 'Skryť faktory ↑' : 'Zobraziť faktory ↓'}
      </button>

      {showFactors && factors && (
        <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)',
                      paddingTop: 12 }}>
          <BRIFactorBar label="Recency"    value={factors.recency}    color="#1D9E75" />
          <BRIFactorBar label="Engagement" value={factors.engagement} color="#EF9F27" />
          <BRIFactorBar label="Source"     value={factors.source}     color="#378ADD" />
          <BRIFactorBar label="Match"      value={factors.match}      color="#534AB7" />
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginTop: 12, borderTop: '0.5px solid var(--color-border-tertiary)',
                    paddingTop: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          {lastUpdated
            ? `Aktualizované ${lastUpdated.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}`
            : 'Načítavam...'}
        </span>
        <button onClick={recompute}
                style={{ fontSize: 12, color: 'var(--color-text-info)',
                         background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          Prepočítať ↻
        </button>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────
export function BRILiveScore({
  leadId, profileId, variant = 'ring', size = 'md',
}: BRILiveScoreProps) {
  const bri = useBRILive({ leadId, profileId })

  if (bri.isLoading) {
    const dim = { sm: 48, md: 68, lg: 88 }[size]
    return (
      <div style={{ width: dim, height: dim, borderRadius: '50%',
                    background: 'var(--color-background-secondary)',
                    animation: 'pulse 1.5s ease-in-out infinite' }} />
    )
  }

  switch (variant) {
    case 'badge':
      return <BadgeVariant score={bri.score} colorTier={bri.colorTier}
                           trajectory={bri.trajectory} />
    case 'mini':
      return <MiniVariant score={bri.score} colorTier={bri.colorTier} />
    case 'panel':
      return <PanelVariant {...bri} leadId={leadId} profileId={profileId} />
    case 'ring':
    default:
      return <RingVariant score={bri.score} isPulsing={bri.isPulsing}
                          trajectory={bri.trajectory} colorTier={bri.colorTier}
                          delta={bri.delta} size={size} />
  }
}
