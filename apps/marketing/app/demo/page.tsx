import type { Metadata } from 'next'
import Link from 'next/link'
import {
  DemoCTASection,
  FaqSection,
  HeroSection,
  PainSection,
  SolutionSection,
} from '../../components/demo/DemoSections'
import './demo.css'

export const metadata: Metadata = {
  title: 'Revolis.AI Demo — AI CRM pre realitné kancelárie',
  description:
    'Ukážka Revolis.AI: AI skóre pripravenosti, denné priority maklérov, rýchle odpovede a automatické follow-upy. Spustite demo alebo živú ukážku za 2 minúty.',
  keywords: [
    'Revolis.AI',
    'realitné CRM',
    'AI pre maklérov',
    'lead scoring',
    'follow-up automatizácia',
    'realitná kancelária',
  ],
  openGraph: {
    title: 'Revolis.AI Demo — Kto kúpi tento mesiac',
    description:
      'Jeden pohľad: kto je pripravený kúpiť, čo má tím urobiť dnes a ako AI stráži follow-upy 24/7.',
    type: 'website',
    locale: 'sk_SK',
    siteName: 'Revolis.AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Revolis.AI Demo — AI CRM pre realitné kancelárie',
    description:
      'AI skóre, denný briefing a follow-upy pre realitné tímy. Demo bez registrácie.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/demo',
  },
}

export default function DemoPage() {
  return (
    <div className="demo-page">
      <header className="demo-nav">
        <Link href="/" className="demo-logo">
          REVOLIS<span>.AI</span>
        </Link>
        <nav className="demo-nav-links" aria-label="Sekcie demo">
          <a href="#problem">Problém</a>
          <a href="#solution">Riešenie</a>
          <a href="#faq">FAQ</a>
        </nav>
        <Link href="/" style={{ fontSize: 13, fontWeight: 700, color: 'var(--demo-muted)', textDecoration: 'none' }}>
          Hlavná stránka →
        </Link>
      </header>

      <main className="demo-wrap">
        <HeroSection />
        <PainSection />
        <SolutionSection />
        <DemoCTASection />
        <FaqSection />
      </main>
    </div>
  )
}
