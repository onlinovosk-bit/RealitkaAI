'use client'

import { useState } from 'react'
import LeadCaptureModal from '../LeadCaptureModal'
import { zakulisiePath } from '../../lib/zakulisie'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

type Props = {
  variant?: 'hero' | 'band'
}

export default function DemoCTA({ variant = 'hero' }: Props) {
  const [leadModal, setLeadModal] = useState<string | null>(null)

  if (variant === 'hero') {
    return (
      <>
        <div className="demo-cta-row" style={{ marginTop: 24, justifyContent: 'flex-start' }}>
          <button
            type="button"
            className="demo-btn-primary"
            onClick={() => {
              window.gtag?.('event', 'demo_cta_click', { position: 'hero_primary' })
              setLeadModal('demo-hero')
            }}
          >
            Spustiť úvodné nastavenie do 30 sekúnd →
          </button>
          <a
            href={zakulisiePath()}
            className="demo-btn-secondary"
            style={{ color: 'var(--demo-ink)', borderColor: 'var(--demo-line)' }}
            onClick={() => window.gtag?.('event', 'demo_cta_click', { position: 'hero_secondary' })}
          >
            Pozri 2-min demo
          </a>
        </div>
        {leadModal !== null && (
          <LeadCaptureModal source={leadModal} onClose={() => setLeadModal(null)} />
        )}
      </>
    )
  }

  return (
    <>
      <div className="demo-cta-band">
        <h2>Dnes v noci prídu dopyty.<br />Kto odpovie prvý, berie províziu.</h2>
        <p>
          Revolis.AI ukáže maklérom komu zavolať ako prvému a stráži follow-upy — bez ďalšieho CRM na učenie.
        </p>
        <div className="demo-cta-row">
          <button
            type="button"
            className="demo-btn-primary"
            onClick={() => {
              window.gtag?.('event', 'demo_cta_click', { position: 'final_band' })
              setLeadModal('demo-final')
            }}
          >
            Aktivovať Revolis.AI pre moju kanceláriu →
          </button>
          <a
            href={zakulisiePath()}
            className="demo-btn-secondary"
            onClick={() => window.gtag?.('event', 'demo_cta_click', { position: 'final_demo' })}
          >
            Živé demo bez registrácie
          </a>
        </div>
        <p className="demo-micro">Bez záväzkov · Zrušenie kedykoľvek · Nastavenie za 4 minúty</p>
      </div>
      {leadModal !== null && (
        <LeadCaptureModal source={leadModal} onClose={() => setLeadModal(null)} />
      )}
    </>
  )
}
