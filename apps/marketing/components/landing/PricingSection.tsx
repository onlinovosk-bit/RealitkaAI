import {
  SEAT_TIERS,
  SEAT_TIER_CONFIG,
  COCKPIT_PRODUCTS,
  COCKPIT_LITE_MIN_SEATS,
  ownerCockpitPriceEur,
  isFounderKancelariaEligible,
  founderKancelarieRemaining,
  areSeatCheckoutPricesConfigured,
  SEAT_TIER_CHECKOUT_SOURCE,
} from '../../lib/pricing'
import PricingCta from './PricingCta'

const TIER_COPY: Record<
  (typeof SEAT_TIERS)[number],
  { tagline: string; bullets: string[]; featured?: boolean }
> = {
  solo: {
    tagline: '1 maklér · základný radar a denný plán.',
    bullets: [
      'Denný briefing priorít',
      'Skóre pripravenosti kúpy (BRI)',
      'AI návrhy odpovedí na schválenie',
      `${SEAT_TIER_CONFIG.solo.monthlyGrantPerSeat} kreditov / seat mesačne`,
    ],
  },
  team: {
    tagline: 'Tímy od 3 maklérov · Owner prehľad.',
    bullets: [
      'Všetko zo Solo Seat',
      'Tímový dashboard pre majiteľa',
      'Portálové dopyty na jednom mieste',
      `${SEAT_TIER_CONFIG.team.monthlyGrantPerSeat} kreditov / seat mesačne`,
    ],
    featured: true,
  },
  office: {
    tagline: 'Kancelárie 10+ seatov · zvýhodnená sadzba.',
    bullets: [
      'Všetko z Team Seat',
      'Prioritná podpora',
      'Ranný report pre celý tím',
      `${SEAT_TIER_CONFIG.office.monthlyGrantPerSeat} kreditov / seat mesačne`,
    ],
  },
}

export default function PricingSection() {
  const checkoutAvailable = areSeatCheckoutPricesConfigured()
  const founderEligible = isFounderKancelariaEligible()
  const ownerPrice = ownerCockpitPriceEur({ founderEligible })
  const ownerStandard = COCKPIT_PRODUCTS.owner.priceEur

  return (
    <section id="cennik">
      <div className="wrap">
        <p className="eyebrow">Cenník</p>
        <h2>Seat podľa veľkosti tímu.</h2>
        <p className="sub">
          Ceny z jedného zdroja pravdy v CRM — bez skrytých modulov. Presný balík doladíme na deme.
        </p>

        <div className="plans">
          {SEAT_TIERS.map((tier) => {
            const cfg = SEAT_TIER_CONFIG[tier]
            const copy = TIER_COPY[tier]
            return (
              <article key={tier} className={`plan${copy.featured ? ' featured' : ''}`}>
                {copy.featured && <span className="pill">Najčastejšia voľba</span>}
                <h3>{cfg.label}</h3>
                <div className="price">
                  {cfg.priceEur}
                  <small> € / seat / mes</small>
                </div>
                <p className="note">
                  min. {cfg.minSeats} {cfg.minSeats === 1 ? 'seat' : 'seaty'} · {copy.tagline}
                </p>
                <ul>
                  {copy.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <PricingCta
                  tier={tier}
                  checkoutSource={SEAT_TIER_CHECKOUT_SOURCE[tier]}
                  checkoutAvailable={checkoutAvailable}
                  label={checkoutAvailable ? 'Aktivovať seat →' : 'Rezervovať demo →'}
                  primary
                />
              </article>
            )
          })}
        </div>

        <div className="cockpit-card">
          <p className="eyebrow" style={{ marginBottom: 10 }}>
            Cockpit pre majiteľa
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: 12 }}>
            <strong style={{ color: 'var(--text)' }}>Cockpit Lite</strong> — zadarmo od {COCKPIT_LITE_MIN_SEATS} seatov.
            {' '}
            <strong style={{ color: 'var(--text)' }}>Owner Cockpit</strong> — {ownerPrice} € / mes
            {founderEligible && ownerPrice < ownerStandard && (
              <span style={{ color: 'var(--violet-soft)' }}>
                {' '}
                (founder {ownerStandard} € → {ownerPrice} €, zostáva {founderKancelarieRemaining()})
              </span>
            )}
            , grant {COCKPIT_PRODUCTS.owner.grantCredits} kreditov mesačne.
          </p>
          <PricingCta
            checkoutAvailable={checkoutAvailable}
            label={checkoutAvailable ? 'Owner Cockpit — demo alebo checkout' : 'Rezervovať demo →'}
          />
        </div>

        <p className="guarantee">
          <b>30 dní</b> záruka vrátenia peňazí · zrušenie kedykoľvek · bez dlhodobej zmluvy
        </p>
      </div>
    </section>
  )
}
