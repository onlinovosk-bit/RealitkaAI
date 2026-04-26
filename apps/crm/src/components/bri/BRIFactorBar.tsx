// ================================================================
// Revolis.AI — BRIFactorBar
// Single factor contribution bar
// ================================================================
'use client'

interface BRIFactorBarProps {
  label: string
  value: number
  color: string
}

export function BRIFactorBar({ label, value, color }: BRIFactorBarProps) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 500,
                       color: 'var(--color-text-primary)' }}>{safeValue}</span>
      </div>
      <div style={{ height: 4, background: 'var(--color-border-tertiary)',
                    borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: color,
          width: `${safeValue}%`,
          transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
    </div>
  )
}
