import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Maklérsky štartovací balík — Revolis',
  description:
    'Praktický balík pre maklérov: follow-up správy, checklist obhliadky, šablóna inzerátu a návod na rýchlu odpoveď. V cene 47 € kredit na Revolis po aktivácii účtu.',
  alternates: {
    canonical: '/balik',
  },
  openGraph: {
    url: '/balik',
  },
}

export default function BalikLayout({ children }: { children: React.ReactNode }) {
  return children
}
