// ================================================================
// Revolis.AI — PriceChart
// SVG price timeline — no external chart library
// Shows drops as red circles, stable points as gray
// ================================================================
'use client'
import type { ChartPoint } from '@/types/price-trail'

interface PriceChartProps {
  data:    ChartPoint[]
  width?:  number
  height?: number
}

const PAD  = { top: 16, right: 16, bottom: 32, left: 64 }
const GRID = 4

const fmt = (n: number) =>
  n >= 1000
    ? `${Math.round(n / 1000)}k`
    : String(Math.round(n))

export function PriceChart({ data, width = 520, height = 180 }: PriceChartProps) {
  if (data.length < 2) return null

  const W  = width  - PAD.left - PAD.right
  const H  = height - PAD.top  - PAD.bottom
  const prices = data.map(d => d.price)
  const min    = Math.min(...prices)
  const max    = Math.max(...prices)
  const range  = Math.max(max - min, max * 0.05)   // min 5% range

  const toX = (i: number) =>
    PAD.left + (i / (data.length - 1)) * W

  const toY = (p: number) =>
    PAD.top + (1 - (p - min) / range) * H

  // Y-axis grid lines
  const yTicks = Array.from({ length: GRID + 1 }, (_, i) =>
    min + (range * i / GRID)
  )

  // X-axis date labels (show first, middle, last)
  const labelIdx = [0, Math.floor(data.length / 2), data.length - 1]
  const xLabels  = labelIdx.map(i => ({
    x:    toX(i),
    text: new Date(data[i].date).toLocaleDateString('sk-SK', { day:'numeric', month:'short' }),
  }))

  // Build path
  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(d.price).toFixed(1)}`)
    .join(' ')

  // Area fill path
  const areaPath = [
    `M ${toX(0).toFixed(1)} ${(PAD.top + H).toFixed(1)}`,
    ...data.map((d, i) => `L ${toX(i).toFixed(1)} ${toY(d.price).toFixed(1)}`),
    `L ${toX(data.length - 1).toFixed(1)} ${(PAD.top + H).toFixed(1)}`,
    'Z',
  ].join(' ')

  return (
    <svg
      width={width} height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={`Price history: ${fmt(min)}–${fmt(max)} €`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Y grid lines */}
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={PAD.left} y1={toY(tick).toFixed(1)}
            x2={PAD.left + W} y2={toY(tick).toFixed(1)}
            stroke="var(--color-border-tertiary)"
            strokeWidth="0.5"
          />
          <text
            x={PAD.left - 6} y={toY(tick)}
            textAnchor="end" dominantBaseline="middle"
            fontSize="10" fill="var(--color-text-tertiary)"
          >
            {fmt(tick)} €
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="var(--color-text-info)" fillOpacity="0.06" />

      {/* Main line */}
      <path
        d={linePath}
        fill="none"
        stroke="var(--color-text-info)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {data.map((d, i) => {
        const cx = toX(i)
        const cy = toY(d.price)
        if (d.is_drop) {
          return (
            <g key={i}>
              {/* Drop: red filled circle with outer ring */}
              <circle cx={cx} cy={cy} r={7}  fill="#FCEBEB" />
              <circle cx={cx} cy={cy} r={4}  fill="#E24B4A" />
              {/* Drop label above */}
              <text x={cx} y={cy - 12}
                    textAnchor="middle" fontSize="9"
                    fill="#E24B4A" fontWeight="500">
                {d.delta_pct ? `${d.delta_pct.toFixed(1)}%` : '↓'}
              </text>
            </g>
          )
        }
        return (
          <circle key={i} cx={cx} cy={cy} r={3}
                  fill="var(--color-background-primary)"
                  stroke="var(--color-text-info)"
                  strokeWidth="1.5" />
        )
      })}

      {/* X-axis date labels */}
      {xLabels.map((l, i) => (
        <text key={i}
              x={l.x} y={height - 4}
              textAnchor="middle" fontSize="10"
              fill="var(--color-text-tertiary)">
          {l.text}
        </text>
      ))}
    </svg>
  )
}
