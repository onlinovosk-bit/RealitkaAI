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
  badge?:   string | number
  badgeStyle?: 'hot' | 'blue' | 'gold'
  live?:    boolean
  tag?:     string
}

/* ── Nav structure — text from screenshots ───────────────────── */
const NAV_ITEMS: NavItem[] = [
  {
    label: 'Kde sú peniaze dnes',
    sub:   'Revenue pulse · Hot dealy · Alerty',
    href:  '/dashboard',
    icon:  '💰',
    live:  true,
  },
  {
    label: 'Koľko zarobíme tento mesiac',
    sub:   'Revenue forecast · Pipeline · AI predikcia',
    href:  '/dashboard/forecast',
    icon:  '📈',
  },
  {
    label: 'Môj tím výkonnosť',
    sub:   'Agent scoring · Aktivity · Ghost Resurrection',
    href:  '/dashboard/team',
    icon:  '👥',
  },
  {
    label:   'Predplatné a licencie',
    sub:     'Plán · Fakturácia · Sloty maklérov',
    href:    '/dashboard/billing',
    icon:    '📋',
    tag:     'v2',
  },
  {
    label: 'Nastavenia a integrácie',
    sub:   'Portály · GDPR · API · Notifikácie',
    href:  '/dashboard/settings',
    icon:  '⚙️',
  },
]

const PLANS: { id: Plan; label: string; price: string }[] = [
  { id: 'starter',  label: 'Smart Start',        price: '49 €' },
  { id: 'active',   label: 'Active Force',        price: '99 €' },
  { id: 'market',   label: 'Market Vision',       price: '199 €' },
  { id: 'protocol', label: 'Protocol Authority',  price: '449 €' },
]

/* ── Props ──────────────────────────────────────────────────── */
interface SidebarProps {
  currentPlan: Plan
  onPlanChange: (plan: Plan) => void
}

/* ── Component ──────────────────────────────────────────────── */
export function Sidebar({ currentPlan, onPlanChange }: SidebarProps) {
  const pathname = usePathname()

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
            {PLANS.find(p => p.id === currentPlan)?.label}
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
              onClick={() => onPlanChange(p.id)}
              style={{
                padding:      '5px 4px',
                borderRadius: 5,
                fontSize:     10,
                textAlign:    'center',
                cursor:       'pointer',
                border:       '1px solid',
                borderColor:  p.id === currentPlan
                  ? p.id === 'protocol' ? 'rgba(245,197,24,.4)' : 'rgba(37,99,235,.55)'
                  : 'rgba(255,255,255,.10)',
                background:   p.id === currentPlan
                  ? p.id === 'protocol' ? 'rgba(245,197,24,.12)' : 'rgba(37,99,235,.28)'
                  : 'transparent',
                color:        p.id === currentPlan
                  ? p.id === 'protocol' ? 'var(--gold-400)' : '#93C5FD'
                  : 'rgba(255,255,255,.40)',
                fontWeight:   p.id === currentPlan ? 600 : 400,
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
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display:    'flex',
                alignItems: 'flex-start',
                gap:        10,
                padding:    '9px 14px',
                borderLeft: `2px solid ${active ? 'var(--sb-active-line)' : 'transparent'}`,
                background: active ? 'var(--sb-active)' : 'transparent',
                transition: 'all var(--t-fast)',
                cursor:     'pointer',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--sb-hover)'
                  ;(e.currentTarget as HTMLElement).style.borderLeftColor = 'rgba(148,197,253,.4)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent'
                }
              }}
              >
                {/* Icon */}
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

                {/* Text */}
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
      </nav>

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
        }}>RS</div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: 'rgba(255,255,255,.85)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>Reality Smolko</div>
          <div style={{ fontSize: 10, color: 'var(--sb-muted)' }}>
            {PLANS.find(p => p.id === currentPlan)?.label} · Owner
          </div>
        </div>
      </div>
    </aside>
  )
}
