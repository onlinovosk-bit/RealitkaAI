// ================================================================
// Revolis.AI — MotivationBadge
// Compact seller motivation indicator
// ================================================================
'use client'
import { TIER_CONFIG } from '@/types/price-trail'
import type { MotivationTier } from '@/types/price-trail'

interface MotivationBadgeProps {
  tier:   MotivationTier
  score?: number
  size?:  'sm' | 'md' | 'lg'
}

export function MotivationBadge({ tier, score, size = 'md' }: MotivationBadgeProps) {
  const cfg  = TIER_CONFIG[tier]
  const fs   = size === 'sm' ? 10 : size === 'lg' ? 14 : 12
  const pad  = size === 'sm' ? '2px 7px' : size === 'lg' ? '5px 14px' : '3px 10px'

  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          5,
      fontSize:     fs,
      fontWeight:   500,
      padding:      pad,
      borderRadius: 20,
      background:   cfg.bg,
      color:        cfg.text,
      border:       `0.5px solid ${cfg.color}40`,
      whiteSpace:   'nowrap',
    }}>
      {cfg.label}
      {score !== undefined && (
        <span style={{ opacity: .7 }}>· {score}</span>
      )}
    </span>
  )
}
