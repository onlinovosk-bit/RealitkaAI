import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidZakulisieToken } from '../../../lib/zakulisie'
import { resolvePricingV2View } from '../../../lib/pricing-v2-server'
import { PricingV2Provider } from '../../../components/PricingV2Context'
import './zakulisie.css'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { token } = await params
  if (!isValidZakulisieToken(token)) {
    return { title: 'Revolis.AI — Zákulisie' }
  }
  return {
    title: `Revolis.AI — Zákulisie · ${token}`,
    description:
      'Interné L99 demo, sales playbook a seat model. Stránka nie je určená pre verejné vyhľadávače.',
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
  }
}

export default async function ZakulisieLayout({ children, params }: LayoutProps) {
  const { token } = await params
  if (!isValidZakulisieToken(token)) notFound()
  // Cenník v2 za PRICING_V2_ENABLED (server číta env, klientská stránka dostane katalóg cez kontext).
  const pricingV2 = resolvePricingV2View()
  if (pricingV2) return <PricingV2Provider value={pricingV2}>{children}</PricingV2Provider>
  return <>{children}</>
}
