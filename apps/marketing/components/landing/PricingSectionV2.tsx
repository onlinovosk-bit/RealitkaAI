import { DEMO_SECONDARY_LABEL, type PricingV2View } from '../../lib/pricing-v2-view'
import PricingV2Cta from './PricingV2Cta'

/**
 * Cenník v2 (za PRICING_V2_ENABLED). Všetky sumy idú z `view`, ktorý vzniká z buildPricingV2Catalog();
 * v tomto súbore nie je žiadne číslo ceny. Owner Cockpit sa tu nepredáva samostatne.
 */
export default function PricingSectionV2({ view }: { view: PricingV2View }) {
  return (
    <section id="cennik">
      <div className="wrap">
        <p className="eyebrow">Cenník</p>
        <h2>Jedna cena za celú kanceláriu.</h2>
        <p className="sub">
          Neprídete o províziu, lebo sa nikto neozval. Platíte podľa počtu používateľov v kancelárii,
          nie za jednotlivé moduly. Ukazujeme cenu bez DPH aj konečnú cenu s DPH {view.vatPercent} %.
        </p>

        <div className="plans plans--four">
          {view.bands.map((band) => (
            <article key={band.id} className={`plan${band.id === 'team' ? ' featured' : ''}`}>
              {band.id === 'team' && <span className="pill">Najčastejšia voľba</span>}
              <h3>{band.label}</h3>
              <div className="price">
                {band.netLabel}
                <small> / mes bez DPH</small>
              </div>
              <div className="price-gross">{band.grossLabel}</div>
              <div className="price-gross" data-testid={`annual-${band.id}`}>
                {band.annualLabel}
              </div>
              <p className="note">{band.usersLabel}</p>
              <ul>
                <li>{band.creditsLabel}</li>
                {band.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
                {band.isFromPrice && <li>Cenu pre vašu sieť dojednáme podľa objemu</li>}
              </ul>
              <PricingV2Cta
                href={band.ctaHref}
                label={band.ctaLabel}
                planId={band.id}
                primary
                isDemo={band.ctaIsDemo}
              />
              {!band.ctaIsDemo && (
                <a
                  className="cta-secondary"
                  href={band.demoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {band.demoLabel}
                </a>
              )}
            </article>
          ))}
        </div>

        {!view.plansOnly && (
        <div className="cockpit-card" id="baliky-kreditov">
          <p className="eyebrow" style={{ marginBottom: 10 }}>
            Mesačné balíky kreditov
          </p>
          <p className="cockpit-intro">
            Potrebujete viac kreditov, než dáva váš plán? Pridajte mesačný balík. Samostatne dokúpené
            kredity stoja {view.extraCredit.netLabel} bez DPH ({view.extraCredit.grossLabel}) za kus.
          </p>
          <div className="packs-grid">
            {view.packs.map((pack) => (
              <div key={pack.credits} className="cockpit-col">
                <h4>{pack.creditsLabel}</h4>
                <div className="cockpit-price">
                  {pack.netLabel}
                  <small> / mes bez DPH</small>
                </div>
                <p className="note" style={{ margin: 0 }}>
                  {pack.grossLabel}
                </p>
                <p className="note" style={{ margin: 0 }}>
                  {pack.perCreditLabel}
                </p>
              </div>
            ))}
          </div>
          <PricingV2Cta
            href={view.packsCtaHref}
            label={view.packsCtaLabel}
            planId="packs"
            isDemo={view.packsCtaIsDemo}
          />
          {!view.packsCtaIsDemo && (
            <a
              className="cta-secondary"
              href={view.packsDemoHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              {DEMO_SECONDARY_LABEL}
            </a>
          )}
        </div>
        )}

        <p className="guarantee">
          <b>30 dní</b> záruka vrátenia peňazí · zrušenie kedykoľvek · bez dlhodobej zmluvy
        </p>
      </div>
    </section>
  )
}
