// ================================================================
// Revolis.AI — BRIScoreRing Component
// Animated ring with real-time pulse when score changes
// Usage: <BRIScoreRing leadId="uuid" profileId="uuid" size="lg" />
// ================================================================
'use client'
import { useEffect, useState } from 'react'
import { useBRIScore }          from '@/hooks/use-bri-score'

interface BRIScoreRingProps {
  leadId:    string
  profileId: string
  size?:     'sm' | 'md' | 'lg'
  showDelta?: boolean
}

const SIZE_CONFIG = {
  sm: { ring: 40, stroke: 4, text: 12, label: 9  },
  md: { ring: 60, stroke: 5, text: 16, label: 10 },
  lg: { ring: 80, stroke: 6, text: 22, label: 11 },
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#1D9E75'  // teal — hot
  if (score >= 60) return '#EF9F27'  // amber — warm
  if (score >= 40) return '#378ADD'  // blue — cool
  return '#888780'                   // gray — cold
}

export function BRIScoreRing({
  leadId, profileId, size = 'md', showDelta = true
}: BRIScoreRingProps) {
  const { score, scoreChange, isLoading } = useBRIScore(leadId, profileId)
  const [isPulsing, setIsPulsing] = useState(false)
  const cfg = SIZE_CONFIG[size]

  // Pulse animation on score change
  useEffect(() => {
    if (scoreChange && scoreChange.delta !== 0) {
      setIsPulsing(true)
      const t = setTimeout(() => setIsPulsing(false), 1200)
      return () => clearTimeout(t)
    }
  }, [scoreChange])

  if (isLoading) {
    return (
      <div style={{ width: cfg.ring, height: cfg.ring, borderRadius: '50%',
        background: 'var(--color-background-secondary)' }} />
    )
  }

  const displayScore = score ?? 0
  const radius  = (cfg.ring - cfg.stroke * 2) / 2
  const circ    = 2 * Math.PI * radius
  const offset  = circ - (displayScore / 100) * circ
  const color   = getScoreColor(displayScore)
  const cx      = cfg.ring / 2
  const cy      = cfg.ring / 2

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        position: 'relative',
        width: cfg.ring, height: cfg.ring,
        borderRadius: '50%',
        outline: isPulsing ? `3px solid ${color}40` : '3px solid transparent',
        transition: 'outline 0.3s ease',
      }}>
        <svg width={cfg.ring} height={cfg.ring} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background track */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="var(--color-border-tertiary)"
            strokeWidth={cfg.stroke}
          />
          {/* Score arc */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={cfg.stroke}
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
          />
        </svg>
        {/* Score text */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: cfg.text, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1 }}>
            {displayScore}
          </span>
          <span style={{ fontSize: cfg.label, color: 'var(--color-text-tertiary)', lineHeight: 1 }}>
            BRI
          </span>
        </div>
      </div>

      {/* Delta badge */}
      {showDelta && scoreChange && scoreChange.delta !== 0 && isPulsing && (
        <div style={{
          fontSize: 10, fontWeight: 500,
          color: scoreChange.delta > 0 ? '#085041' : '#791F1F',
          background: scoreChange.delta > 0 ? '#E1F5EE' : '#FCEBEB',
          borderRadius: 20,
          padding: '1px 6px',
          transition: 'opacity 0.3s',
        }}>
          {scoreChange.delta > 0 ? '+' : ''}{scoreChange.delta}
        </div>
      )}
    </div>
  )
}
