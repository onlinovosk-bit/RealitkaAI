import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard — Revolis.AI' }

export default function DashboardPage() {
  return (
    <>
      {/* ── TOP GRID ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* AI ASSIST MODE */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="label-caps">AI ASSIST MODE</span>
            <span className="tag tag-free">FREE</span>
          </div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            AI Asistent je aktívny
          </h2>
          <p className="csub" style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
            AI Asistent pracuje za teba - ty uzatváraš obchody.
          </p>
          <div className="check-item">
            <div className="check-dot" style={{ background: '#6366F1' }} />
            <span style={{ fontSize: 12, color: '#334155' }}>AI Asistent – základný režim</span>
          </div>
          <div className="check-item">
            <div className="check-dot" style={{ background: '#10B981' }} />
            <span style={{ fontSize: 12, color: '#334155' }}>Základné AI hodnotenie príležitostí</span>
          </div>
          <div className="check-item" style={{ marginBottom: 0 }}>
            <div className="check-dot" style={{ background: '#F59E0B' }} />
            <span style={{ fontSize: 12, color: '#334155' }}>Obmedzený prehľad príležitostí</span>
          </div>
        </div>

        {/* AI ASISTENT panel */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>AI Asistent</h2>
            <div className="tabs">
              <button className="tab active">Hovor</button>
              <button className="tab">Obchod</button>
              <button className="tab">Prehľad</button>
            </div>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>Príležitosť</p>
          <div style={{
            padding: '8px 12px', background: 'var(--surface-input)',
            borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border-light)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 10, cursor: 'pointer',
          }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>Tomáš Králik</span>
            <span style={{ color: 'var(--text-secondary)' }}>▾</span>
          </div>
          <div className="ai-question"><span className="ai-question-n">1.</span> Aké dojmy mal klient z obhliadky domu a spĺňa jeho očakávania?</div>
          <div className="ai-question"><span className="ai-question-n">2.</span> Má klient akékoľvek špecifické požiadavky či preferencie, ktoré by mal zvážiť pri ďalších ponukách?</div>
          <div className="ai-question"><span className="ai-question-n">3.</span> Kedy by chcel Tomáš uskutočniť ďalšie kroky k uzavretiu obchodu?</div>
        </div>
      </div>

      {/* ── STATS ROW ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <div className="stat-card">
          <span className="label-caps">Všetky príležitosti</span>
          <div className="stat-value">103</div>
          <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>V databáze CRM</p>
        </div>
        <div className="stat-card">
          <span className="label-caps">Obhliadky</span>
          <div className="stat-value">77</div>
          <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Naplánované stretnutia</p>
        </div>
        <div className="stat-card" style={{ borderColor: 'var(--danger-bd)' }}>
          <span className="label-caps" style={{ color: 'var(--danger)' }}>Horúce príležitosti</span>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>109</div>
          <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Najvyššia priorita</p>
        </div>
      </div>

      {/* ── AI SALES OS ───────────────────────────────────────── */}
      <div className="card card-gold">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span className="label-caps" style={{ color: 'var(--warn)' }}>AI SALES OS — MESAČNÝ ODHAD (€)</span>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>apríl 2026</span>
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
          578 979 <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text-secondary)' }}>€</span>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Horúci (80+): 7 → 312 450 €</span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Teplý (50–79): 18 → 188 529 €</span>
        </div>
      </div>
    </>
  )
}
