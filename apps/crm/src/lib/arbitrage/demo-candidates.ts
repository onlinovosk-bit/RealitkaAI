import type { ArbitrageCandidate } from '@/types/acquisition-hub'

/** Internal demo fixtures — only returned when isArbitrageDemoAllowed() and demo:true. */
export const ARBITRAGE_DEMO_CANDIDATES: ArbitrageCandidate[] = [
  {
    id: 'demo-1',
    name: 'Ing. Peter Kováč',
    email: 'p.kovac@email.sk',
    phone: '+421 905 123 456',
    interestedAddress: '3-izb. byt, Bratislava – Ružinov, 72 m²',
    ownedAddress: '4-izb. rodinný dom, okolie Bratislavy (hľadá)',
    arbitrageScore: 94,
    reasoning:
      'Aktívne predáva byt v Ružinove. Zároveň hľadá rodinný dom — cross-sell: jedna obhliadka, dva mandáty.',
    recommendedAction: 'Navrhnúť simultánny predaj bytu a kúpu domu. Pripraviť odhad Ružinova pred obhliadkou.',
  },
  {
    id: 'demo-2',
    name: 'Mgr. Jana Šimková',
    email: 'j.simkova@firma.sk',
    phone: '+421 907 654 321',
    interestedAddress: 'Menší byt v centre Trnavy, max 120 000 €',
    ownedAddress: 'Rodinný dom, Trnava, 140 m²',
    arbitrageScore: 87,
    reasoning:
      'Predáva rodinný dom a hľadá menší byt — downsize scenár, vysoká motivácia.',
    recommendedAction: 'Kontaktovať dnes: exkluzívny mandát na dom + match bytu do 48 h.',
  },
]
