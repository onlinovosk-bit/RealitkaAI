'use client'
import { useState } from 'react'

interface Props {
  source: string
  onClose: () => void
}

declare global { interface Window { gtag?: (...args: unknown[]) => void } }

export default function LeadCaptureModal({ source, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/lead-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, source }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      window.gtag?.('event', 'lead_captured', {
        event_category: 'conversion',
        cta_source: source,
        email_domain: email.split('@')[1] ?? '',
      })
    } catch {
      setStatus('error')
      setErrorMsg('Nastala chyba. Skúste znova.')
    }
  }

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '14px 16px',
    borderRadius: 12, background: 'rgba(255,255,255,.04)',
    color: '#fff', fontSize: 15, outline: 'none',
    fontFamily: 'inherit', display: 'block',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(5,10,24,.88)', backdropFilter: 'blur(10px)',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#0A0F1E',
        border: '1px solid rgba(14,165,233,.25)',
        borderRadius: 20,
        padding: '40px 36px',
        maxWidth: 460, width: '100%',
        position: 'relative',
        boxShadow: '0 40px 100px rgba(0,0,0,.7)',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)',
            color: 'rgba(255,255,255,.45)', borderRadius: 8,
            width: 32, height: 32, cursor: 'pointer', fontSize: 20,
            lineHeight: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Zavrieť"
        >×</button>

        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 12 }}>
              Ste na zozname!
            </div>
            <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 15, lineHeight: 1.65, marginBottom: 24 }}>
              Ozveme sa do 24 hodín s prístupom a onboarding plánom pre Vašu kanceláriu.
            </p>
            <button
              onClick={onClose}
              style={{
                padding: '13px 32px', borderRadius: 12,
                background: '#0EA5E9', color: '#fff',
                border: 'none', cursor: 'pointer',
                fontWeight: 800, fontSize: 15, fontFamily: 'inherit',
              }}
            >Zatvoriť</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 999,
              background: 'rgba(14,165,233,.1)', border: '1px solid rgba(14,165,233,.2)',
              fontSize: 11, fontWeight: 700, color: '#0EA5E9',
              letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 16,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', display: 'inline-block', animation: 'blink 1.5s infinite' }} />
              Zakladateľský prístup — obmedzené miesta
            </div>

            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 8 }}>
              Aktivujte Revolis.AI<br />pre svoju kanceláriu
            </div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,.45)', lineHeight: 1.6, marginBottom: 24 }}>
              Bez záväzkov · Nastavenie za 4 minúty · Zrušenie kedykoľvek
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Vaše meno (nepovinné)"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ ...inputBase, border: '1px solid rgba(255,255,255,.1)' }}
              />
              <input
                type="email"
                placeholder="Váš pracovný email *"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ ...inputBase, border: '1px solid rgba(14,165,233,.35)', background: 'rgba(14,165,233,.04)' }}
              />
            </div>

            {status === 'error' && (
              <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                width: '100%', padding: '16px',
                borderRadius: 12, border: 'none',
                cursor: status === 'loading' ? 'wait' : 'pointer',
                background: status === 'loading'
                  ? 'rgba(14,165,233,.4)'
                  : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
                color: '#fff', fontSize: 16, fontWeight: 800,
                fontFamily: 'inherit', marginTop: 4,
                transition: 'opacity .2s',
              }}
            >
              {status === 'loading' ? 'Spracovávam...' : 'Aktivovať Revolis.AI →'}
            </button>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
              {['Bez záväzkov', 'GDPR compliant', 'Bezpečné'].map(t => (
                <span key={t} style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#4ADE80' }}>✓</span> {t}
                </span>
              ))}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
