import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidZakulisieToken } from '../../../lib/zakulisie'
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
  return <>{children}</>
}
