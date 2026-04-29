import type { Metadata } from 'next'
import { FEATURES, PLAN_LABELS, PLAN_PRICES, PLAN_DESC, PLAN_ORDER } from '@/types/revolis'
import type { Plan } from '@/types/revolis'

export const metadata: Metadata = { title: 'Predplatné — Revolis.AI' }

const PLAN_COLORS: Record<Plan, string> = {
  starter:  '#64748B',
  active:   '#2563EB',
  market:   '#1B3A5C',
  protocol: '#D97706',
}

function FeatureRow({ feature, currentPlan }: { feature: typeof FEATURES[0]; currentPlan: Plan }) {
  const unlocked = PLAN_ORDER.indexOf(currentPlan) >= PLAN_ORDER.indexOf(feature.plan)
  const isGold   = feature.plan === 'protocol'
  const bars = [
    { l: 'Impact', v: feature.impact, c: '#1B3A5C' },
    { l: 'Effort', v: feature.effort, c: '#D97706' },
    { l: 'Moat',   v: feature.moat,   c: '#6366F1' },
    { l: 'Speed',  v: feature.speed,  c: '#059669' },
  ]

  return (
    <div className={`feat-row ${!unlocked ? 'feat-locked' : ''}`}
         style={{ borderColor: isGold && unlocked ? 'rgba(245,197,24,.35)' : undefined }}>
      {!unlocked && (
        <div className="lock-note">
          🔒 od {PLAN_LABELS[feature.plan]}
        </div>
      )}
      <div className="feat-icon" style={{
        background: unlocked ? (isGold ? '#FEF9EE' : 'var(--navy-50)') : 'var(--surface-input)',
      }}>
        {unlocked ? feature.icon : '🔒'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="feat-name" style={{ color: unlocked ? (isGold ? '#92400E' : 'var(--text-primary)') : 'var(--text-muted)' }}>
          {feature.id}. {feature.name}
          {isGold && unlocked && (
            <span style={{ fontSize: 9, color: '#D97706', fontWeight: 700 }}>★ Protocol</span>
          )}
        </div>
        <p className="feat-desc">{feature.desc}</p>

        {unlocked ? (
          <>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
              {feature.tags.map((tag, i) => {
                const [bg, col] = (feature.tagColors[i] ?? '#F1EFE8|#444441').split('|')
                return (
                  <span key={tag} style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                    background: bg, color: col,
                  }}>{tag}</span>
                )
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {bars.map(b => (
                <div key={b.l} className="feat-bar-row">
                  <span className="feat-bar-label">{b.l}</span>
                  <div className="feat-bar-track">
                    <div className="feat-bar-fill" style={{ width: `${b.v}%`, background: b.c }} />
                  </div>
                  <span className="feat-bar-val" style={{ color: b.c }}>{b.v}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Dostupné od{' '}
            <strong style={{ color: PLAN_COLORS[feature.plan] }}>
              {PLAN_LABELS[feature.plan]}
            </strong>
          </p>
        )}
      </div>
    </div>
  )
}

// Server component — shows market plan by default
// In production this reads from user session
const DEMO_PLAN: Plan = 'market'

export default function BillingPage() {
  const sections: Plan[] = ['starter', 'active', 'market', 'protocol']

  return (
    <>
      {sections.map(planId => {
        const features     = FEATURES.filter(f => f.plan === planId)
        const color        = PLAN_COLORS[planId]
        const isActive     = planId === DEMO_PLAN
        const isLocked     = PLAN_ORDER.indexOf(DEMO_PLAN) < PLAN_ORDER.indexOf(planId)
        const isGold       = planId === 'protocol'

        return (
          <div key={planId} className={`card ${isGold ? 'card-gold' : ''}`}
               style={{ borderColor: color + (isActive ? '60' : '25') }}>
            {/* Plan header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color }}>{PLAN_LABELS[planId]}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{PLAN_DESC[planId]}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>
                  {PLAN_PRICES[planId]}
                </span>
                {isActive && (
                  <span className="tag" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '0.5px solid var(--success-bd)' }}>
                    Aktívny plán
                  </span>
                )}
                {!isActive && !isLocked && (
                  <button className="btn btn-outline" style={{ fontSize: 11, borderColor: color, color }}>
                    Upgradovať
                  </button>
                )}
              </div>
            </div>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {features.map(f => (
                <FeatureRow key={f.id} feature={f} currentPlan={DEMO_PLAN} />
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}
