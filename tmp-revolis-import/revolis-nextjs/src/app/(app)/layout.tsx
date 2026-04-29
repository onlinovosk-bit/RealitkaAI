'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar }  from '@/components/layout/TopBar'
import type { Plan } from '@/types/revolis'

/* ── Toast data ─────────────────────────────────────────────── */
interface ToastItem {
  id:      string
  type:    string
  color:   string
  name:    string
  message: string
  cta:     string
  time:    string
  accent:  string
}

const TOAST_POOL: Omit<ToastItem, 'id'>[] = [
  { type:'AI',    color:'#6366F1', name:'Tomáš B.',   message:'Prepočítané AI skóre príležitosti — BRI vzrástol na 91.',         cta:'Kliknúť pre AI kroky →',  time:'9s',           accent:'#6366F1' },
  { type:'MATCH', color:'#059669', name:'Jana H.',    message:'Nájdená vhodná nehnuteľnosť pre klienta.',                          cta:'Kliknúť pre AI kroky →',  time:'246s',         accent:'#059669' },
  { type:'MATCH', color:'#059669', name:'Tomáš B.',   message:'Nájdená vhodná nehnuteľnosť — arbitrážna delta 14%.',               cta:'Kliknúť pre AI kroky →',  time:'306s',         accent:'#059669' },
  { type:'MSG',   color:'#2563EB', name:'Eva M.',     message:'Odoslaný follow-up klientovi automaticky.',                          cta:'Kliknúť pre AI kroky →',  time:'práve teraz',  accent:'#2563EB' },
  { type:'PLAN',  color:'#D97706', name:'Peter N.',   message:'Naplánovaný ďalší follow-up — zajtra 10:00.',                       cta:'Kliknúť pre AI kroky →',  time:'238s',         accent:'#D97706' },
  { type:'HOT',   color:'#DC2626', name:'Ján Molnár', message:'Urgentný lead — klient čaká 5+ dní. Konaj teraz.',                  cta:'Zavolať teraz →',         time:'práve teraz',  accent:'#DC2626' },
]

/* ── Page title map ─────────────────────────────────────────── */
const PAGE_META: Record<string, [string, string]> = {
  '/dashboard':            ['Prehľad biznisu',              'Prehľad výkonnosti tímu a prioritných príležitostí.'],
  '/forecast':             ['Koľko zarobíme tento mesiac',  'Revenue forecast · Pipeline · AI predikcia'],
  '/team':                 ['Môj tím výkonnosť',            'Agent scoring · Aktivity · Ghost Resurrection'],
  '/team/permissions':     ['Oprávnenia tímu',              'Správa prístupov a rolí maklérov'],
  '/billing':              ['Predplatné a licencie',        'Plán · Fakturácia · Sloty maklérov'],
  '/settings':             ['Nastavenia a integrácie',      'Portály · GDPR · API · Notifikácie'],
}

function getPageMeta(pathname: string): [string, string] {
  // Strip group prefix "(app)" — pathname from usePathname already does this
  const key = Object.keys(PAGE_META)
    .filter(k => pathname.endsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return PAGE_META[key] ?? ['Revolis.AI', 'Revenue OS']
}

/* ── Layout ─────────────────────────────────────────────────── */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [plan,   setPlan]   = useState<Plan>('market')
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const poolIdx = useRef(0)

  const fireToast = useCallback((data?: Omit<ToastItem, 'id'>) => {
    const source = data ?? TOAST_POOL[poolIdx.current++ % TOAST_POOL.length]
    const item: ToastItem = { ...source, id: `${Date.now()}-${Math.random()}` }
    setToasts(prev => [...prev, item].slice(-3))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== item.id))
    }, 6500)
  }, [])

  // Auto-fire sequence on mount
  useEffect(() => {
    const delays = [1200, 4000, 7500, 12000, 16500, 21000]
    const timers = delays.map((d, i) =>
      setTimeout(() => fireToast(TOAST_POOL[i % TOAST_POOL.length]), d)
    )
    const loop = setInterval(() => fireToast(), 9000)
    return () => { timers.forEach(clearTimeout); clearInterval(loop) }
  }, [fireToast])

  const [title, subtitle] = getPageMeta(pathname)

  return (
    <div className="app-shell">
      <Sidebar currentPlan={plan} onPlanChange={setPlan} />

      <div className="app-main">
        <TopBar
          title={title}
          subtitle={subtitle}
          onAlertClick={() => fireToast()}
        />
        <main className="app-body">
          {children}
        </main>
      </div>

      {/* ── Toast container ── */}
      <div className="toast-container">
        {toasts.map(t => (
          <div
            key={t.id}
            className="toast"
            style={{ borderLeftColor: t.accent }}
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
          >
            <div className="toast-header">
              <span className="toast-type" style={{ color: t.color }}>{t.type}</span>
              <span className="toast-time">{t.time}</span>
            </div>
            <div className="toast-name">{t.name}</div>
            <div className="toast-msg">{t.message}</div>
            <div className="toast-cta">{t.cta}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
