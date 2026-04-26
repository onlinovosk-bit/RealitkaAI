// ================================================================
// Revolis.AI — Morning Brief Settings Panel
// ================================================================
'use client'
import { useMorningBrief } from '@/hooks/use-morning-brief'

interface BriefSettingsProps {
  profileId: string
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const skHour = (i + 2) % 24
  return {
    utc:   i,
    label: `${String(skHour).padStart(2, '0')}:00 SK čas`,
  }
})

export function BriefSettings({ profileId }: BriefSettingsProps) {
  const { settings, weekStats, pushSupported, isLoading, isSaving,
          saveSettings, subscribePush } = useMorningBrief(profileId)

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center',
                    color: 'var(--color-text-tertiary)', fontSize: 14 }}>
        Načítavam nastavenia…
      </div>
    )
  }

  if (!settings) return null

  return (
    <div style={{ maxWidth: 520 }}>

      {/* Enable toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 20,
                    padding: '14px 16px',
                    background: 'var(--color-background-secondary)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '0.5px solid var(--color-border-tertiary)' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500,
                      color: 'var(--color-text-primary)', margin: '0 0 2px' }}>
            Ranný brief
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>
            Denný AI prehľad doručený o {String((settings.delivery_hour_utc + 2) % 24).padStart(2,'0')}:00
          </p>
        </div>
        <input type="checkbox" checked={settings.enabled}
               style={{ width: 18, height: 18, cursor: 'pointer' }}
               onChange={e => saveSettings({ enabled: e.target.checked })} />
      </div>

      {settings.enabled && (
        <>
          {/* Delivery time */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)',
                            display: 'block', marginBottom: 6 }}>
              Čas doručenia
            </label>
            <select
              value={settings.delivery_hour_utc}
              style={{ width: '100%' }}
              onChange={e => saveSettings({ delivery_hour_utc: parseInt(e.target.value) })}>
              {HOUR_OPTIONS.map(o => (
                <option key={o.utc} value={o.utc}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Variant */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)',
                            display: 'block', marginBottom: 8 }}>
              Formát
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['A', 'B'] as const).map(v => (
                <button key={v}
                  onClick={() => saveSettings({ a_b_variant: v })}
                  style={{
                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                    textAlign: 'left', fontSize: 13,
                    background: settings.a_b_variant === v
                      ? 'var(--color-background-info)' : 'var(--color-background-secondary)',
                    color: settings.a_b_variant === v
                      ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
                    border: settings.a_b_variant === v
                      ? '1px solid var(--color-border-info)'
                      : '0.5px solid var(--color-border-tertiary)',
                  }}>
                  <strong style={{ display: 'block', marginBottom: 2 }}>
                    {v === 'A' ? 'Stručný (3 vety)' : 'Podrobný (5 viet)'}
                  </strong>
                  <span style={{ fontSize: 11, opacity: .8 }}>
                    {v === 'A' ? 'Ideálny pre mobil' : 'S kontextom a dôvodmi'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Content toggles */}
          <div style={{ marginBottom: 16,
                        background: 'var(--color-background-secondary)',
                        borderRadius: 'var(--border-radius-md)',
                        border: '0.5px solid var(--color-border-tertiary)',
                        overflow: 'hidden' }}>
            {[
              { key: 'include_lv_changes',  label: 'Zmeny na liste vlastníctva',  icon: '📋' },
              { key: 'include_arbitrage',   label: 'Arbitrážne príležitosti',     icon: '💰' },
              { key: 'include_price_drops', label: 'Poklesy cien nehnuteľností',  icon: '📉' },
            ].map((item, i) => (
              <div key={item.key}
                   style={{
                     display: 'flex', justifyContent: 'space-between',
                     alignItems: 'center', padding: '12px 14px',
                     borderBottom: i < 2 ? '0.5px solid var(--color-border-tertiary)' : 'none',
                   }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {item.icon}  {item.label}
                </span>
                <input type="checkbox"
                       checked={(settings as any)[item.key]}
                       style={{ width: 16, height: 16, cursor: 'pointer' }}
                       onChange={e => saveSettings({ [item.key]: e.target.checked } as any)} />
              </div>
            ))}
          </div>

          {/* Push notifications */}
          {pushSupported && (
            <div style={{ marginBottom: 16,
                          background: settings.push_subscription
                            ? 'var(--color-background-success)'
                            : 'var(--color-background-secondary)',
                          borderRadius: 'var(--border-radius-md)',
                          border: '0.5px solid var(--color-border-tertiary)',
                          padding: '14px 16px' }}>
              <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 4px',
                          color: 'var(--color-text-primary)' }}>
                Push notifikácie
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 10px' }}>
                {settings.push_subscription
                  ? 'Push notifikácie sú aktívne na tomto zariadení.'
                  : 'Dostávajte brief priamo na mobil bez otvorenia e-mailu.'}
              </p>
              {!settings.push_subscription && (
                <button onClick={subscribePush} style={{ fontSize: 12 }}>
                  Aktivovať push notifikácie
                </button>
              )}
            </div>
          )}

          {/* Stats */}
          {weekStats.length > 0 && (
            <div>
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)',
                          marginBottom: 8 }}>
                Výkonnosť briefov (posledné týždne)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                {[
                  { label: 'Open rate', value: `${weekStats[0]?.open_rate_pct ?? 0}%` },
                  { label: 'Click rate', value: `${weekStats[0]?.click_rate_pct ?? 0}%` },
                  { label: 'Ø BRI top leadu', value: weekStats[0]?.avg_top_lead_score ?? 0 },
                ].map(s => (
                  <div key={s.label}
                       style={{ background: 'var(--color-background-secondary)',
                                borderRadius: 8, padding: '8px 10px',
                                border: '0.5px solid var(--color-border-tertiary)' }}>
                    <p style={{ fontSize: 16, fontWeight: 500,
                                color: 'var(--color-text-primary)', margin: '0 0 2px' }}>
                      {s.value}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)', margin: 0 }}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isSaving && (
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)',
                        marginTop: 8, textAlign: 'center' }}>
              Ukladám…
            </p>
          )}
        </>
      )}
    </div>
  )
}
