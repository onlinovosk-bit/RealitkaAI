'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { Plan } from '@/types/revolis'

/* ── Types ──────────────────────────────────────────────────── */
interface NavItem {
  label:    string
  sub:      string
  href:     string
  icon:     string
  minPlan?: Plan
  badge?:   string | number
  badgeStyle?: 'hot' | 'blue' | 'gold'
  live?:    boolean
  tag?:     string
}

interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

/* ── CRO navigation hierarchy (psychology-first) ─────────────── */
const NAV_GROUPS: NavGroup[] = [
  {
    id: 'arena-prilezitosti',
    label: 'ARÉNA PRÍLEŽITOSTÍ',
    items: [
      {
        label: 'Predčasný signál obchodov',
        sub:   'Prístup k ponukám skôr, než sa stanú verejnými.',
        href:  '/l99-hub?tab=radar',
        icon:  '📡',
        minPlan: 'protocol',
        live: true,
      },
      {
        label: 'Extrakcia mŕtveho kapitálu',
        sub:   'Premena neaktívnych leadov na živé provízie.',
        href:  '/l99-hub?tab=ghost',
        icon:  '♻️',
        minPlan: 'market',
      },
      {
        label: 'Kataster Röntgen',
        sub:   'Hĺbková analýza majetkových pohybov na trhu.',
        href:  '/akvizieia/radar-okolia',
        icon:  '🧾',
        minPlan: 'market',
      },
    ],
  },
  {
    id: 'trhova-dominancia',
    label: 'TRHOVÁ DOMINANCIA',
    items: [
      {
        label: 'Algoritmus priority (Kill-Chain)',
        sub:   'AI poradovník hovorov s najvyššou pravdepodobnosťou úspechu.',
        href:  '/revolis-ai',
        icon:  '🎯',
        minPlan: 'market',
      },
      {
        label: 'Detektor slabosti konkurencie',
        sub:   'Identifikácia miest, kde vaši rivali strácajú dych.',
        href:  '/l99-hub',
        icon:  '🕳️',
        minPlan: 'protocol',
      },
    ],
  },
  {
    id: 'autorita-protokol',
    label: 'AUTORITA A PROTOKOL',
    items: [
      {
        label: 'Digitálny certifikát dôvery',
        sub:   'Vaša vizuálna zbraň pri nábore exkluzivít.',
        href:  '/team',
        icon:  '🏅',
      },
      {
        label: 'Protokol úniku peňazí',
        sub:   'Ochrana firemného know-how a kontrola efektivity tímu.',
        href:  '/dashboard/reputation/integrity',
        icon:  '🛡️',
        minPlan: 'protocol',
      },
      {
        label: 'Neuro-lingvistický tréning',
        sub:   'Okamžitý upgrade obchodných zručností cez AI mentorstvo.',
        href:  '/revolis-ai',
        icon:  '🧠',
        minPlan: 'protocol',
      },
    ],
  },
]

const PLANS: { id: Plan; label: string; price: string }[] = [
  { id: 'starter',  label: 'Smart Starter',      price: '49 €' },
  { id: 'active',   label: 'Active Force',        price: '99 €' },
  { id: 'market',   label: 'Market Vision',       price: '199 €' },
  { id: 'protocol', label: 'Protocol Authority',  price: '449 €' },
]

const PLAN_LEVEL: Record<Plan, number> = {
  starter: 0,
  active: 1,
  market: 2,
  protocol: 3,
}

/* ── Props ──────────────────────────────────────────────────── */
type UserRole = 'owner' | 'agent' | 'senior' | string

interface SidebarProps {
  userName?: string
  role?: UserRole
  accountTier?: string | null
  currentPlan?: Plan
  onPlanChange?: (plan: Plan) => void
}

/* ── Component ──────────────────────────────────────────────── */
export function Sidebar({
  userName,
  role,
  accountTier,
  currentPlan,
  onPlanChange,
}: SidebarProps) {
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'arena-prilezitosti': true,
    'trhova-dominancia': true,
    'autorita-protokol': true,
  })
  const resolvedPlan: Plan = currentPlan
    ?? (accountTier === 'protocol_authority'
      ? 'protocol'
      : accountTier === 'market_vision'
        ? 'market'
        : accountTier === 'active_force'
          ? 'active'
          : 'starter')
  const roleLabel =
    role === 'owner' ? 'Majiteľ kancelárie' :
    role === 'agent' ? 'Maklér' :
    role === 'senior' ? 'Senior maklér' :
    (role ? String(role) : 'Používateľ')
  const displayName = userName?.trim() || 'Prihlásený používateľ'
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('') || 'RV'

  return (
    <aside style={{
      width:       'var(--sidebar-w)',
      minWidth:    'var(--sidebar-w)',
      background:  'linear-gradient(180deg, var(--sb-bg-deep) 0%, var(--sb-bg) 100%)',
      display:     'flex',
      flexDirection: 'column',
      borderRight: '1px solid var(--sb-border)',
      height:      '100vh',
      overflow:    'hidden',
      position:    'relative',
    }}>

      {/* Subtle top accent line */}
      <div style={{
        position:   'absolute',
        top:        0, left: 0, right: 0,
        height:     2,
        background: 'linear-gradient(90deg, var(--gold-400), transparent)',
        opacity:    0.4,
      }} />

      {/* ── Logo ── */}
      <div style={{
        padding:      '18px 16px 14px',
        borderBottom: '1px solid var(--sb-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div style={{
            width:        24, height: 24,
            borderRadius: 6,
            background:   '#2563EB',
            display:      'flex', alignItems: 'center', justifyContent: 'center',
            fontSize:     10, fontWeight: 800, color: '#fff',
            flexShrink:   0,
          }}>R</div>
          <span style={{
            fontSize:     17, fontWeight: 800,
            color:        '#fff', letterSpacing: '0.01em',
          }}>
            Revolis<span style={{ color: 'var(--gold-400)' }}>.AI</span>
          </span>
          <span style={{
            fontSize:    9, fontWeight: 700,
            padding:     '2px 6px',
            borderRadius: 4,
            background:  'rgba(255,255,255,.12)',
            color:       'rgba(255,255,255,.65)',
            letterSpacing: '0.06em',
          }}>DEMO</span>
        </div>
        <div style={{
          fontSize:     9, color: 'var(--sb-muted)',
          letterSpacing: '0.18em', paddingLeft: 32,
          fontFamily:   'var(--font-mono)',
        }}>REVENUE OS</div>

        {/* Plan badge */}
        <div style={{
          marginTop:    10,
          padding:      '5px 10px',
          background:   'rgba(37,99,235,.18)',
          border:       '1px solid rgba(37,99,235,.35)',
          borderRadius: 6,
          display:      'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#60A5FA' }} />
          <span style={{ fontSize: 11, color: '#93C5FD', fontWeight: 600 }}>
            {PLANS.find(p => p.id === resolvedPlan)?.label}
          </span>
        </div>
      </div>

      {/* ── Founder Demo Mode ── */}
      <div style={{
        margin:  '8px 8px 0',
        padding: '8px 10px',
        background: 'rgba(255,255,255,.04)',
        borderRadius: 7,
      }}>
        <div style={{
          fontSize:     9, color: 'var(--sb-muted)',
          letterSpacing: '0.14em', fontWeight: 700,
          marginBottom: 7, fontFamily: 'var(--font-mono)',
        }}>FOUNDER DEMO MODE</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {PLANS.map(p => (
            <button
              key={p.id}
              onClick={() => onPlanChange?.(p.id)}
              style={{
                padding:      '5px 4px',
                borderRadius: 5,
                fontSize:     10,
                textAlign:    'center',
                cursor:       'pointer',
                border:       '1px solid',
                borderColor:  p.id === resolvedPlan
                  ? p.id === 'protocol' ? 'rgba(245,197,24,.4)' : 'rgba(37,99,235,.55)'
                  : 'rgba(255,255,255,.10)',
                background:   p.id === resolvedPlan
                  ? p.id === 'protocol' ? 'rgba(245,197,24,.12)' : 'rgba(37,99,235,.28)'
                  : 'transparent',
                color:        p.id === resolvedPlan
                  ? p.id === 'protocol' ? 'var(--gold-400)' : '#93C5FD'
                  : 'rgba(255,255,255,.40)',
                fontWeight:   p.id === resolvedPlan ? 600 : 400,
                transition:   'all var(--t-fast)',
                whiteSpace:   'nowrap',
                overflow:     'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {p.label.split(' ')[0] === 'Protocol' ? 'Protocol Auth.' : p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
        {NAV_GROUPS.map(group => {
          const groupOpen = !!openGroups[group.id]
          return (
            <div key={group.id} style={{ marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => setOpenGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 14px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--sb-muted)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                <span>{group.label}</span>
                <span style={{ color: 'rgba(255,255,255,.45)' }}>{groupOpen ? '▾' : '▸'}</span>
              </button>

              {groupOpen && group.items.map(item => {
                const minPlan = item.minPlan ?? 'starter'
                const isLocked = PLAN_LEVEL[resolvedPlan] < PLAN_LEVEL[minPlan]
                const active = !!pathname && (pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href)))

                return (
                  <Link
                    key={item.href}
                    href={isLocked ? '#' : item.href}
                    style={{ textDecoration: 'none', pointerEvents: isLocked ? 'none' : 'auto' }}
                  >
                    <div style={{
                      display:    'flex',
                      alignItems: 'flex-start',
                      gap:        10,
                      padding:    '9px 14px',
                      marginInline: 6,
                      borderRadius: 8,
                      borderLeft: `2px solid ${active ? 'var(--sb-active-line)' : 'transparent'}`,
                      background: active ? 'var(--sb-active)' : 'transparent',
                      transition: 'all var(--t-fast)',
                      cursor:     isLocked ? 'not-allowed' : 'pointer',
                      opacity:    isLocked ? 0.55 : 1,
                    }}
                    >
                      <div style={{
                        width:         26, height: 26,
                        borderRadius:  6,
                        display:       'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize:      12,
                        background:    active ? 'rgba(37,99,235,.25)' : 'rgba(255,255,255,.06)',
                        flexShrink:    0,
                        marginTop:     1,
                      }}>
                        {item.icon}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize:   12, fontWeight: 600,
                          color:      active ? '#fff' : 'var(--sb-text)',
                          display:    'flex', alignItems: 'center', gap: 5,
                          flexWrap:   'wrap',
                          lineHeight: 1.3,
                        }}>
                          {item.label}
                          {item.live && (
                            <span className="tag-live" style={{
                              fontSize:     8, padding: '1px 5px',
                              borderRadius: 3,
                              background:   'rgba(16,185,129,.22)',
                              color:        '#6EE7B7', fontWeight: 700,
                              letterSpacing: '0.06em',
                            }}>live</span>
                          )}
                          {item.tag && (
                            <span style={{
                              fontSize:     8, padding: '1px 5px',
                              borderRadius: 3,
                              background:   'rgba(37,99,235,.28)',
                              color:        '#93C5FD', fontWeight: 700,
                            }}>{item.tag}</span>
                          )}
                          {isLocked && (
                            <span style={{
                              fontSize: 8,
                              padding: '1px 5px',
                              borderRadius: 3,
                              background: 'rgba(245,197,24,.16)',
                              color: 'var(--gold-400)',
                              fontWeight: 700,
                            }}>
                              Od {PLANS.find(p => p.id === minPlan)?.label}
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize:     10, color: 'var(--sb-muted)',
                          marginTop:    2, lineHeight: 1.4,
                          whiteSpace:   'nowrap', overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {item.sub}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div style={{ padding: '8px 12px 12px' }}>
        <Link
          href="/billing"
          style={{
            display: 'block',
            textDecoration: 'none',
            padding: '10px 12px',
            borderRadius: 9,
            textAlign: 'center',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#111827',
            background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
            boxShadow: '0 8px 18px rgba(245,158,11,.25)',
          }}
        >
          ZASTAVIŤ VYTRÁCANIE MOJICH PROVÍZIÍ
        </Link>
      </div>

      {/* ── User ── */}
      <div style={{
        padding:      '10px 14px',
        borderTop:    '1px solid var(--sb-border)',
        display:      'flex', alignItems: 'center', gap: 9,
      }}>
        <div style={{
          width:        28, height: 28,
          borderRadius: 7,
          background:   '#1D4ED8',
          display:      'flex', alignItems: 'center', justifyContent: 'center',
          fontSize:     11, fontWeight: 800, color: '#BFDBFE',
          flexShrink:   0,
        }}>{initials}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: 'rgba(255,255,255,.85)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{displayName}</div>
          <div style={{ fontSize: 10, color: 'var(--sb-muted)' }}>
            {PLANS.find(p => p.id === resolvedPlan)?.label} · {roleLabel}
          </div>
        </div>
      </div>
    </aside>
  )
}
