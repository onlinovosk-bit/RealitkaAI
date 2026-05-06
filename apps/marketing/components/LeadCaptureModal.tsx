'use client'
import { useState } from 'react'

interface Props {
  source: string
  onClose: () => void
}

declare global { interface Window { gtag?: (...args: unknown[]) => void } }

// ── Standard lead-capture flow ─────────────────────────────────────────────

function StandardModal({ source, onClose }: Props) {
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
    <>
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
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
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
    </>
  )
}

// ── Audit upsell flow (3-step) ─────────────────────────────────────────────

type AuditStep = 'intro' | 'form' | 'redirecting'

function AuditModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<AuditStep>('intro')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const PURPLE = '#A855F7'
  const PURPLE_DIM = 'rgba(168,85,247,.15)'
  const PURPLE_BORDER = 'rgba(168,85,247,.3)'

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '14px 16px',
    borderRadius: 12, background: 'rgba(255,255,255,.04)',
    color: '#fff', fontSize: 15, outline: 'none',
    fontFamily: 'inherit', display: 'block', boxSizing: 'border-box',
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !name) return
    setErrorMsg('')
    setStep('redirecting')

    window.gtag?.('event', 'rscan_checkout_start', { price_tier: '149' })

    try {
      const res = await fetch('/api/revenue-scan/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error ?? 'checkout_failed')
      window.location.href = data.url
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Nastala chyba. Skúste znova.')
      setStep('form')
    }
  }

  if (step === 'intro') {
    return (
      <>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 999,
          background: PURPLE_DIM, border: `1px solid ${PURPLE_BORDER}`,
          fontSize: 11, fontWeight: 700, color: PURPLE,
          letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 20,
        }}>
          Jednorazová analýza — 149€
        </div>

        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 12 }}>
          Revenue Scan Report
        </div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', lineHeight: 1.7, marginBottom: 24 }}>
          Nahrajte databázu kontaktov. Za 48 hodín dostanete BRI skóre každého
          kontaktu, prioritizovaný zoznam a konkrétny akčný plán — kto, kedy, ako.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {[
            ['📊', 'BRI skóre 0–100 pre každý kontakt'],
            ['📋', 'Prioritizovaný zoznam HORÚCICH príležitostí'],
            ['📈', 'Live SK trhové signály pre vaše regióny'],
            ['📄', 'PDF report + CSV na import do CRM'],
            ['✉️', 'Personalizovaný akčný plán v slovenčine'],
          ].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, lineHeight: '22px' }}>{icon}</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            window.gtag?.('event', 'rscan_modal_open', { source: 'revenue-scan' })
            setStep('form')
          }}
          style={{
            width: '100%', padding: '16px',
            borderRadius: 12, border: 'none',
            cursor: 'pointer',
            background: `linear-gradient(135deg,${PURPLE},#7C3AED)`,
            color: '#fff', fontSize: 16, fontWeight: 800,
            fontFamily: 'inherit',
          }}
        >
          Pokračovať →
        </button>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,.25)', textAlign: 'center', marginTop: 12 }}>
          Súbor kontaktov nahráte po zaplatení · GDPR compliant
        </p>
      </>
    )
  }

  if (step === 'redirecting') {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
          Presmerovávam na platbu...
        </div>
        <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 14 }}>
          Bezpečná platba cez Stripe
        </p>
      </div>
    )
  }

  // step === 'form'
  return (
    <form onSubmit={handleCheckout}>
      <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 6 }}>
        Vaše kontaktné údaje
      </div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginBottom: 20 }}>
        Databázu kontaktov nahráte po zaplatení.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Meno a priezvisko *"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          style={{ ...inputBase, border: `1px solid ${PURPLE_BORDER}`, background: PURPLE_DIM }}
        />
        <input
          type="email"
          placeholder="Pracovný email *"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ ...inputBase, border: `1px solid ${PURPLE_BORDER}`, background: PURPLE_DIM }}
        />
        <input
          type="tel"
          placeholder="Telefón (nepovinné)"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          style={{ ...inputBase, border: '1px solid rgba(255,255,255,.1)' }}
        />
      </div>

      {errorMsg && (
        <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>{errorMsg}</p>
      )}

      <button
        type="submit"
        style={{
          width: '100%', padding: '16px',
          borderRadius: 12, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg,${PURPLE},#7C3AED)`,
          color: '#fff', fontSize: 16, fontWeight: 800,
          fontFamily: 'inherit', marginTop: 4,
        }}
      >
        Prejsť na platbu — 149€ →
      </button>

      <button
        type="button"
        onClick={() => setStep('intro')}
        style={{
          width: '100%', marginTop: 10, padding: '10px',
          background: 'transparent', border: 'none',
          color: 'rgba(255,255,255,.3)', fontSize: 13, cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        ← Späť
      </button>

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        {['Bezpečná platba', 'GDPR compliant', 'Bez záväzkov'].map(t => (
          <span key={t} style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#4ADE80' }}>✓</span> {t}
          </span>
        ))}
      </div>
    </form>
  )
}

// ── Root component ─────────────────────────────────────────────────────────

export default function LeadCaptureModal({ source, onClose }: Props) {
  const isAudit = source === 'revenue-scan'

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
        border: `1px solid ${isAudit ? 'rgba(168,85,247,.3)' : 'rgba(14,165,233,.25)'}`,
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
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Zavrieť"
        >×</button>

        {isAudit
          ? <AuditModal onClose={onClose} />
          : <StandardModal source={source} onClose={onClose} />
        }
      </div>
    </div>
  )
}
