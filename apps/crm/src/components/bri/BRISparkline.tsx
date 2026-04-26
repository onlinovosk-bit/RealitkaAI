// ================================================================
// Revolis.AI — BRISparkline
// Lightweight SVG sparkline — no external chart library needed
// ================================================================
'use client'
import type { BRIHistoryPoint } from '@/types/bri'

interface BRISparklineProps {
  data:   BRIHistoryPoint[]
  height: number
  color:  string
  width?: number
}

export function BRISparkline({ data, height, color, width = 240 }: BRISparklineProps) {
  if (data.length < 2) return null

  const scores  = data.map(d => d.score)
  const min     = Math.min(...scores)
  const max     = Math.max(...scores)
  const range   = Math.max(max - min, 10)  // minimum range of 10 to avoid flat lines
  const pad     = 6

  const toX = (i: number) =>
    (pad + (i / (data.length - 1)) * (width - pad * 2)).toFixed(2)

  const toY = (s: number) =>
    (pad + ((1 - (s - min) / range) * (height - pad * 2))).toFixed(2)

  const points = data.map((d, i) => `${toX(i)},${toY(d.score)}`).join(' ')

  // Filled area path
  const areaD = [
    `M ${toX(0)} ${height - pad}`,
    ...data.map((d, i) => `L ${toX(i)} ${toY(d.score)}`),
    `L ${toX(data.length - 1)} ${height - pad}`,
    'Z',
  ].join(' ')

  const lastScore = scores[scores.length - 1]
  const lastX     = parseFloat(toX(data.length - 1))
  const lastY     = parseFloat(toY(lastScore))

  return (
    <svg
      width={width} height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={`BRI history: ${min}–${max}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Area fill */}
      <path d={areaD} fill={color} fillOpacity="0.08" />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current value dot */}
      <circle cx={lastX} cy={lastY} r="3.5" fill={color} />
      <circle cx={lastX} cy={lastY} r="6" fill={color} fillOpacity="0.15" />
    </svg>
  )
}
