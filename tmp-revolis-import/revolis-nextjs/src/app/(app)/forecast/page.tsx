import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Revenue Forecast — Revolis.AI' }

const LEADS = [
  { name: 'Ján Molnár',     loc: 'Ružomberok',                score: 47 },
  { name: 'Veronika Varga', loc: 'Trenčín',                   score: 47 },
  { name: 'Lucia Molnár',   loc: 'Bratislava - Nové Mesto',   score: 47 },
]

export default function ForecastPage() {
  return (
    <>
      {/* Upgrade banner */}
      <div style={{
        background: 'var(--navy-800)', borderRadius: 'var(--radius-lg)',
        padding: '11px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 8, cursor: 'pointer',
      }}>
        <span style={{ color: 'var(--gold-400)', fontSize: 14 }}>✦</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
          Odomknúť Protocol Authority od 449 € mesačne
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Priority leads */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                Prioritné príležitosti
              </h2>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Klienti s vysokým skóre alebo horúcim stavom.
              </p>
            </div>
            <button className="btn btn-outline" style={{ fontSize: 11 }}>Zobraziť všetky</button>
          </div>

          {LEADS.map(l => (
            <div key={l.name} className="lead-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{l.loc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="tag tag-hot">Horúci</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                    {l.score}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
                <button className="btn btn-outline" style={{ fontSize: 10, padding: '4px 10px' }}>📞 Zavolať</button>
                <button className="btn btn-outline" style={{ fontSize: 10, padding: '4px 10px' }}>💬 SMS</button>
                <button className="btn btn-outline" style={{ fontSize: 10, padding: '4px 10px', color: 'var(--info)', borderColor: 'var(--navy-100)' }}>→ Detail</button>
              </div>
            </div>
          ))}

          <div style={{
            background: 'var(--surface-input)', border: '1.5px dashed var(--border-light)',
            borderRadius: 'var(--radius-lg)', padding: 18, textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>🔒</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
              +4 ďalších prioritných príležitostí
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Odomkni vyšší program a získaj viac klientov každý deň.
            </div>
          </div>
        </div>

        {/* AI odporúčania */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>AI Odporúčania</h2>
            <span className="tag tag-free">FREE</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
            Denné odporúčania na základe tvojich dát
          </p>

          <div className="rec rec-warn">
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
            <div>
              <div className="rec-title" style={{ color: '#991B1B' }}>Strácaš 454 klientov</div>
              <div className="rec-body" style={{ color: '#7F1D1D' }}>
                454 príležitostí nemá kontakt 5+ dní. Rýchla správa môže zachrániť obchod.
              </div>
              <div className="rec-cta" style={{ color: 'var(--danger)' }}>Klikni a zobraz 3 príležitosti ↓</div>
            </div>
          </div>

          <div className="rec rec-fire">
            <span style={{ fontSize: 16, flexShrink: 0 }}>🔥</span>
            <div>
              <div className="rec-title" style={{ color: '#92400E' }}>173 horúcich príležitostí čaká na akciu</div>
              <div className="rec-body" style={{ color: '#78350F' }}>
                Tieto príležitosti majú vysoké skóre. Zavolaj ešte dnes.
              </div>
              <div className="rec-cta" style={{ color: 'var(--warn)' }}>Zobraziť príležitosti →</div>
            </div>
          </div>

          {/* Live feed */}
          <div className="card" style={{ padding: '10px 12px' }}>
            <span className="label-caps" style={{ display: 'block', marginBottom: 6 }}>LIVE FEED</span>
            {[
              { tc: '#6366F1', type: 'AI',    name: 'Tomáš B.', head: 'Prepočítané AI skóre príležitosti', t: '9s' },
              { tc: '#059669', type: 'MATCH', name: 'Jana H.',   head: 'Nájdená vhodná nehnuteľnosť',       t: '246s' },
              { tc: '#059669', type: 'MATCH', name: 'Tomáš B.',  head: 'Nájdená vhodná nehnuteľnosť',       t: '306s' },
            ].map(r => (
              <div key={r.t} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 0', borderBottom: '0.5px solid var(--border-light)', cursor: 'pointer',
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: r.tc, width: 36, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
                  {r.type}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.head}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--navy-800)', fontWeight: 600 }}>{r.name}</div>
                </div>
                <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{r.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
