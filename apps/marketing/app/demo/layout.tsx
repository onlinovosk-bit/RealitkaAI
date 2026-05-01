import type { Metadata } from 'next'
import './demo.css'

export const metadata: Metadata = {
  title: 'Revolis.AI — AI Demo · Radar, Sekvencia, Street Intelligence',
  description: 'Živé AI demo: radar leadov, konverzačná inteligencia, street-level analýza trhu. Bez registrácie.',
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
