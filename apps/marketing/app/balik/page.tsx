'use client'

import { useState } from 'react'
import Link from 'next/link'
import './balik.css'

const PACK_ITEMS = [
  {
    title: '10 follow-up šablón',
    text: 'Nový dopyt, po obhliadke, cenová námietka, oživenie kontaktu — hotové texty na úpravu.',
    value: '~15 €',
  },
  {
    title: 'Checklist obhliadky',
    text: 'Jedna strana: pred, počas a po obhliadke. Nič nezabudneš.',
    value: '~8 €',
  },
  {
    title: 'Šablóna inzerátu',
    text: 'Štruktúra + poznámky čo v texte funguje na portáloch.',
    value: '~12 €',
  },
  {
    title: 'Mini-návod 5 minút',
    text: 'Ako odpovedať na nový dopyt rýchlo a konkrétne.',
    value: '~10 €',
  },
  {
    title: '47 € kredit na Revolis',
    text: 'Unikátny kód — po aktivácii účtu pripíšeme kredity (neexpirujú).',
    value: '47 €',
  },
]

export default function BalikPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/starter-pack/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, marketingConsent: consent }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
        return
      }
      if (data.error === 'checkout_not_configured') {
        setError('Predajný kanál sa pripravuje — checkout bude dostupný po schválení release.')
      } else if (data.error === 'consent_required') {
        setError('Potvrď súhlas s obchodnými oznámeniami.')
      } else {
        setError('Checkout sa nepodarilo spustiť. Skús neskôr.')
      }
    } catch {
      setError('Chyba siete. Skús znova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="balik-page">
      <header className="balik-nav">
        <Link href="/" className="balik-logo">
          REVOLIS<span>.AI</span>
        </Link>
        <Link href="/demo" style={{ fontSize: 13, fontWeight: 700, color: 'var(--balik-muted)', textDecoration: 'none' }}>
          Demo CRM →
        </Link>
      </header>

      <main className="balik-wrap">
        <section className="balik-hero">
          <p className="balik-tag">Maklérsky štartovací balík</p>
          <h1 className="balik-title">
            Šablóny a checklisty,<br />
            <em>ktoré používaš hneď.</em>
          </h1>
          <p className="balik-lead">
            Praktický balík pre maklérov: follow-up správy, checklist obhliadky, šablóna inzerátu
            a návod na rýchlu odpoveď. V cene 47 € kredit na Revolis po aktivácii účtu.
          </p>

          <div className="balik-price-card">
            <div className="balik-price">
              47 € <span>jednorazovo</span>
            </div>
            <div className="balik-credit-badge">+ 47 € kredit na Revolis v cene</div>
          </div>

          <form className="balik-form" onSubmit={handleCheckout}>
            <label htmlFor="balik-name">Meno</label>
            <input
              id="balik-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tvoje meno"
            />
            <label htmlFor="balik-email">Email *</label>
            <input
              id="balik-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="makler@email.sk"
            />
            <label className="balik-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                Súhlasím so spracovaním údajov na doručenie balíka a s obchodnými oznámeniami
                týkajúcimi sa produktov Revolis (text na AKMV review). Faktúru vystaví Stripe.
              </span>
            </label>
            <button type="submit" className="balik-cta" disabled={loading || !email || !consent}>
              {loading ? 'Presmerovanie…' : 'Kúpiť balík — 47 €'}
            </button>
            {error && <p className="balik-error">{error}</p>}
          </form>

          <p className="balik-note">
            Stránka nie je nasadená — čaká na schválenie obsahu a Stripe produktu (Andy).
          </p>
        </section>

        <section className="balik-sec">
          <h2>Čo je v balíku</h2>
          <div className="balik-grid">
            {PACK_ITEMS.map((item) => (
              <article key={item.title} className="balik-item">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <p style={{ marginTop: 8, fontSize: '0.8rem', fontWeight: 700, color: 'var(--balik-brand-deep)' }}>
                  Hodnota {item.value}
                </p>
              </article>
            ))}
          </div>
          <p className="balik-anchor">
            Samostatne by materiály stáli približne 45–50 € + kredit 47 €. Balík: 47 € jednorazovo.
          </p>
        </section>
      </main>
    </div>
  )
}
