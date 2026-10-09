'use client'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

type Props = {
  href: string
  label: string
  planId: string
  primary?: boolean
  isDemo?: boolean
}

/**
 * CTA cenníka v2: obyčajný odkaz do registrácie v CRM (alebo na demo pri pásme Sieť).
 * Zámerne NIE je to tlačidlo do Stripe checkoutu: web nepozná agencyId, bez neho by CRM webhook
 * platbu nezaradil ako v2 a kredity by sa nepridelili.
 */
export default function PricingV2Cta({ href, label, planId, primary, isDemo }: Props) {
  return (
    <a
      className={primary ? 'btn' : 'btn btn-ghost'}
      href={href}
      {...(isDemo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      onClick={() => window.gtag?.('event', 'pricing_cta_click', { plan_name: planId, checkout: false, pricing: 'v2' })}
    >
      {label}
    </a>
  )
}
