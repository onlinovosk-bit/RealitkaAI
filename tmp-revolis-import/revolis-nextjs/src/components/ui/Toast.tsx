'use client'

import { useEffect, useRef, useCallback } from 'react'

export interface ToastData {
  id:        string
  type:      string
  typeColor: string
  name:      string
  message:   string
  cta:       string
  time:      string
  accent:    string   // left border color
}

const TOAST_DEFINITIONS: Omit<ToastData, 'id'>[] = [
  {
    type: 'AI', typeColor: '#6366F1', name: 'Tomáš B.',
    message: 'Prepočítané AI skóre príležitosti — BRI vzrástol na 91.',
    cta: 'Kliknúť pre AI kroky →', time: '9s',
    accent: '#6366F1',
  },
  {
    type: 'MATCH', typeColor: '#059669', name: 'Jana H.',
    message: 'Nájdená vhodná nehnuteľnosť pre klienta.',
    cta: 'Kliknúť pre AI kroky →', time: '246s',
    accent: '#059669',
  },
  {
    type: 'MATCH', typeColor: '#059669', name: 'Tomáš B.',
    message: 'Nájdená vhodná nehnuteľnosť — arbitrážna delta 14%.',
    cta: 'Kliknúť pre AI kroky →', time: '306s',
    accent: '#059669',
  },
  {
    type: 'MSG', typeColor: '#2563EB', name: 'Eva M.',
    message: 'Odoslaný follow-up klientovi automaticky.',
    cta: 'Kliknúť pre AI kroky →', time: 'práve teraz',
    accent: '#2563EB',
  },
  {
    type: 'PLAN', typeColor: '#D97706', name: 'Peter N.',
    message: 'Naplánovaný ďalší follow-up — zajtra 10:00.',
    cta: 'Kliknúť pre AI kroky →', time: '238s',
    accent: '#D97706',
  },
  {
    type: 'HOT', typeColor: '#DC2626', name: 'Ján Molnár',
    message: 'Urgentný lead — klient čaká 5+ dní. Konaj teraz.',
    cta: 'Zavolať teraz →', time: 'práve teraz',
    accent: '#DC2626',
  },
]

interface ToastContainerProps {
  toasts:   ToastData[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="toast"
          style={{ borderLeftColor: toast.accent }}
          onClick={() => onRemove(toast.id)}
        >
          <div className="toast-header">
            <span className="toast-type" style={{ color: toast.typeColor }}>
              {toast.type}
            </span>
            <span className="toast-time">{toast.time}</span>
          </div>
          <div className="toast-name">{toast.name}</div>
          <div className="toast-msg">{toast.message}</div>
          <div className="toast-cta">{toast.cta}</div>
        </div>
      ))}
    </div>
  )
}

/* ── Hook ───────────────────────────────────────────────────── */
export function useToasts() {
  const counterRef = useRef(0)
  const toastsRef  = useRef<ToastData[]>([])
  const setStateRef = useRef<((fn: (prev: ToastData[]) => ToastData[]) => void) | null>(null)

  const addToast = useCallback((def?: Omit<ToastData, 'id'>) => {
    const source = def ?? TOAST_DEFINITIONS[counterRef.current++ % TOAST_DEFINITIONS.length]
    const toast: ToastData = { ...source, id: `t-${Date.now()}-${Math.random()}` }

    setStateRef.current?.(prev => {
      const next = [...prev, toast].slice(-3) // max 3 visible
      return next
    })

    // Auto-remove after 6.5s
    setTimeout(() => {
      setStateRef.current?.(prev => prev.filter(t => t.id !== toast.id))
    }, 6500)
  }, [])

  return { addToast, setStateRef, TOAST_DEFINITIONS }
}
