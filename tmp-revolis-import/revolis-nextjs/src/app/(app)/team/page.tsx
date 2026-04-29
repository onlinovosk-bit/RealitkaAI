import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Tím výkonnosť — Revolis.AI' }

const AGENTS = [
  { name: 'Andrej Novák',   role: 'Senior maklér', score: 78, color: 'var(--navy-800)' },
  { name: 'Jana Horáková',  role: 'Maklér',        score: 65, color: 'var(--warn)' },
  { name: 'Peter Kováč',    role: 'Junior maklér', score: 42, color: 'var(--danger)' },
]

export default function TeamPage() {
  return (
    <>
      {/* ── Agent scores ── */}
      <div className="card">
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Môj tím výkonnosť
        </h2>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Agent scoring · Aktivity · Ghost Resurrection
        </p>

        {AGENTS.map((a, i) => (
          <div key={a.name} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 0',
            borderBottom: i < AGENTS.length - 1 ? '0.5px solid var(--border-light)' : 'none',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--navy-50)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'var(--navy-800)', flexShrink: 0,
            }}>
              {a.name[0]}{a.name.split(' ')[1]?.[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 5 }}>{a.role}</div>
              <div style={{ height: 3, background: 'var(--border-light)', borderRadius: 2 }}>
                <div style={{ width: `${a.score}%`, height: '100%', background: a.color, borderRadius: 2 }} />
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: a.color, fontFamily: 'var(--font-mono)' }}>
              {a.score}
            </div>
          </div>
        ))}

        {/* Permissions link */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '0.5px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Správa oprávnení a prístupov</span>
          <Link href="/team/permissions" style={{
            fontSize: 11, fontWeight: 600, color: 'var(--info)',
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            Oprávnenia tímu →
          </Link>
        </div>
      </div>

      {/* ── Ghost Resurrection ── */}
      <div className="card card-gold">
        <span className="label-caps" style={{ color: 'var(--warn)' }}>GHOST RESURRECTION 2.0 — BSM HOOK</span>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '6px 0 4px' }}>
          14 dormantných leadov na reaktiváciu
        </h2>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
          BSM reforma 2026 je ideálny reaktivačný trigger. &ldquo;Vaša nehnuteľnosť bude ovplyvnená novou legislatívou — chceli by ste vedieť ako?&rdquo;
        </p>
        <button className="btn btn-primary" style={{ fontSize: 12 }}>
          Spustiť Ghost Resurrection →
        </button>
      </div>
    </>
  )
}
