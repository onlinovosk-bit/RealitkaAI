import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Oprávnenia tímu — Revolis.AI' }

/* ── Role definitions ── */
const ROLES = [
  {
    id:    'owner',
    label: 'Owner',
    color: 'var(--gold-500)',
    bg:    'var(--gold-50)',
    desc:  'Plný prístup — fakturácia, tím, nastavenia, všetky dáta',
    perms: [
      'Zobraziť všetky príležitosti',
      'Upraviť a zmazať príležitosti',
      'Spravovať tím a oprávnenia',
      'Prístup k fakturácii a plánu',
      'Export kontaktov (neobmedzený)',
      'Integrácie a API kľúče',
      'Integrity Monitor — všetky alerty',
      'Protocol Authority funkcie',
    ],
  },
  {
    id:    'senior',
    label: 'Senior maklér',
    color: 'var(--navy-800)',
    bg:    'var(--navy-50)',
    desc:  'Rozšírený prístup — vlastné leady + tímové štatistiky',
    perms: [
      'Zobraziť vlastné príležitosti',
      'Zobraziť tímové štatistiky (len čítanie)',
      'Export vlastných kontaktov (max 100/deň)',
      'BRI Live Score — vlastné leady',
      'Morning Brief',
      'Arbitráž Engine (len návrhy)',
    ],
    denied: [
      'Fakturácia a plán',
      'Integrity Monitor',
      'Tímové oprávnenia',
    ],
  },
  {
    id:    'agent',
    label: 'Maklér',
    color: 'var(--info)',
    bg:    '#EFF6FF',
    desc:  'Základný prístup — vlastné leady a aktivity',
    perms: [
      'Zobraziť vlastné príležitosti',
      'BRI Live Score — vlastné leady',
      'Morning Brief',
      'Export vlastných kontaktov (max 30/deň)',
    ],
    denied: [
      'Tímové štatistiky',
      'Arbitráž Engine',
      'Fakturácia a plán',
      'Integrity Monitor',
      'API kľúče',
    ],
  },
]

/* ── Agents with assigned roles ── */
const TEAM_MEMBERS = [
  { name: 'Reality Smolko',  initials: 'RS', email: 'smolko@realita.sk',       role: 'owner',  active: true },
  { name: 'Andrej Novák',    initials: 'AN', email: 'novak@realita.sk',         role: 'senior', active: true },
  { name: 'Jana Horáková',   initials: 'JH', email: 'horakova@realita.sk',      role: 'agent',  active: true },
  { name: 'Peter Kováč',     initials: 'PK', email: 'kovac@realita.sk',         role: 'agent',  active: false },
]

export default function TeamPermissionsPage() {
  return (
    <>
      {/* ── Back link ── */}
      <div style={{ marginBottom: 4 }}>
        <Link href="/team" style={{
          fontSize: 12, color: 'var(--text-secondary)',
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          ← Späť na tím
        </Link>
      </div>

      {/* ── Role overview cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        {ROLES.map(role => (
          <div key={role.id} className="card" style={{ borderColor: role.color + '40' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 10px', borderRadius: 20,
              background: role.bg,
              border: `0.5px solid ${role.color}40`,
              marginBottom: 8,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: role.color }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: role.color }}>{role.label}</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
              {role.desc}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {role.perms.map(p => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text-primary)' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="6" fill={role.color} fillOpacity=".15" />
                    <path d="M3.5 6L5.2 7.7L8.5 4.3" stroke={role.color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {p}
                </div>
              ))}
              {role.denied?.map(p => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text-muted)' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="6" fill="var(--border-light)" />
                    <path d="M4 4L8 8M8 4L4 8" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  {p}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Team members table ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
              Členovia tímu
            </h2>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {TEAM_MEMBERS.length} členov · {TEAM_MEMBERS.filter(m => m.active).length} aktívnych
            </p>
          </div>
          <button className="btn btn-primary" style={{ fontSize: 11, padding: '6px 12px' }}>
            + Pozvať makléra
          </button>
        </div>

        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 180px 120px 80px',
          gap: 12, padding: '6px 12px',
          fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
          color: 'var(--text-secondary)', textTransform: 'uppercase',
          borderBottom: '0.5px solid var(--border-light)', marginBottom: 4,
        }}>
          <span>Maklér</span>
          <span>E-mail</span>
          <span>Rola</span>
          <span>Stav</span>
        </div>

        {TEAM_MEMBERS.map((m, i) => {
          const role = ROLES.find(r => r.id === m.role)!
          return (
            <div key={m.email} style={{
              display: 'grid', gridTemplateColumns: '1fr 180px 120px 80px',
              gap: 12, padding: '10px 12px',
              borderBottom: i < TEAM_MEMBERS.length - 1 ? '0.5px solid var(--border-light)' : 'none',
              alignItems: 'center',
            }}>
              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: role.bg, border: `0.5px solid ${role.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, color: role.color, flexShrink: 0,
                }}>
                  {m.initials}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {m.name}
                </span>
              </div>

              {/* Email */}
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {m.email}
              </span>

              {/* Role badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 9px', borderRadius: 20, width: 'fit-content',
                background: role.bg, border: `0.5px solid ${role.color}35`,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: role.color }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: role.color }}>{role.label}</span>
              </div>

              {/* Status */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 9px', borderRadius: 20, width: 'fit-content',
                background: m.active ? 'var(--success-bg)' : 'var(--surface-input)',
                border: `0.5px solid ${m.active ? 'var(--success-bd)' : 'var(--border-light)'}`,
              }}>
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: m.active ? 'var(--success)' : 'var(--text-muted)',
                }} />
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: m.active ? 'var(--success)' : 'var(--text-muted)',
                }}>
                  {m.active ? 'Aktívny' : 'Neaktívny'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Export audit note ── */}
      <div className="card" style={{ borderColor: 'var(--warn-bd)', background: 'var(--warn-bg)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M8 2L14 13H2L8 2Z" fill="#D97706" fillOpacity=".2" stroke="#D97706" strokeWidth="1" strokeLinejoin="round" />
            <path d="M8 6V9M8 11V11.5" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--warn)', marginBottom: 3 }}>
              Agent Integrity Monitor je aktívny
            </p>
            <p style={{ fontSize: 11, color: '#78350F', lineHeight: 1.5 }}>
              Každý export kontaktov je logovaný. Pri prekročení limitu (50 exportov/deň) dostanete e-mail alert okamžite. Databáza kontaktov je vaše najcennejšie aktívum — chránime ho automaticky.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
