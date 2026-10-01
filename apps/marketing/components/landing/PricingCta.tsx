'use client'

import { useState } from 'react'
import LeadCaptureModal from '../LeadCaptureModal'
import { calendlyHref } from '../../lib/calendly'
import type { SeatTier } from '../../lib/pricing'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

type Props = {
  tier?: SeatTier
  checkoutSource?: string
  checkoutAvailable: boolean
  label: string
  primary?: boolean
}

export default function PricingCta({ tier, checkoutSource, checkoutAvailable, label, primary }: Props) {
  const [modal, setModal] = useState<string | null>(null)

  if (checkoutAvailable && checkoutSource) {
    return (
      <>
        <button
          type="button"
          className={primary ? 'btn' : 'btn btn-ghost'}
          onClick={() => {
            window.gtag?.('event', 'pricing_cta_click', { plan_name: tier ?? 'owner', checkout: true })
            setModal(checkoutSource)
          }}
        >
          {label}
        </button>
        {modal !== null && <LeadCaptureModal source={modal} onClose={() => setModal(null)} />}
      </>
    )
  }

  return (
    <a
      className={primary ? 'btn' : 'btn btn-ghost'}
      href={calendlyHref(tier ? `pricing_${tier}` : 'pricing_owner')}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => window.gtag?.('event', 'pricing_cta_click', { plan_name: tier ?? 'owner', checkout: false })}
    >
      {label}
    </a>
  )
}
