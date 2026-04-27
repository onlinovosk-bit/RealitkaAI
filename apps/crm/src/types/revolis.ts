export type Plan = 'starter' | 'active' | 'market' | 'protocol'

export const PLAN_ORDER: Plan[] = ['starter', 'active', 'market', 'protocol']

export const PLAN_LABELS: Record<Plan, string> = {
  starter:  'Smart Start',
  active:   'Active Force',
  market:   'Market Vision',
  protocol: 'Protocol Authority',
}

export const PLAN_PRICES: Record<Plan, string> = {
  starter:  '49 €/mes',
  active:   '99 €/mes',
  market:   '199 €/mes',
  protocol: '449 €/mes',
}

export const PLAN_DESC: Record<Plan, string> = {
  starter:  '1 maklér · základné AI funkcie',
  active:   '1 maklér · plný AI',
  market:   '1 owner + 1 maklér',
  protocol: '1 owner + 4 makléri · Gold tier',
}

export function planUnlocks(featurePlan: Plan, currentPlan: Plan): boolean {
  return PLAN_ORDER.indexOf(currentPlan) >= PLAN_ORDER.indexOf(featurePlan)
}

/* ── 14 Features ── */
export interface Feature {
  id:        number
  plan:      Plan
  phase:     string
  name:      string
  desc:      string
  icon:      string
  tags:      string[]
  tagColors: string[]   // "bg|text" pairs
  impact:    number
  effort:    number
  moat:      number
  speed:     number
}

export const FEATURES: Feature[] = [
  {
    id: 1, plan: 'starter', phase: 'Fáza 1',
    name: 'Event sourcing pipeline',
    desc: 'Každá akcia (klik, otvorenie, hovor, export) → events tabuľka. Nervová sústava všetkého.',
    icon: '⚡', tags: ['Kritické','Foundation','Backend'],
    tagColors: ['#FEE2E2|#991B1B','#E0E7FF|#3730A3','#F1F5F9|#475569'],
    impact: 98, effort: 35, moat: 60, speed: 95,
  },
  {
    id: 2, plan: 'starter', phase: 'Fáza 1',
    name: 'BRI Live Score — skóre ktoré dýcha',
    desc: 'Každý lead má číslo 0–100 meniace sa v reálnom čase. Pohyb predáva urgentnosť.',
    icon: '📊', tags: ['WOW moment','AI core','Demo-ready'],
    tagColors: ['#FEE2E2|#991B1B','#E0E7FF|#3730A3','#D1FAE5|#065F46'],
    impact: 95, effort: 45, moat: 85, speed: 90,
  },
  {
    id: 3, plan: 'starter', phase: 'Fáza 1',
    name: 'Ambient morning brief — 08:00 push',
    desc: 'Každý deň o 8:00: kto je najhorúcejší, čo sa zmenilo cez noc, jedna odporúčaná akcia.',
    icon: '🌅', tags: ['Retention','Mobile-first','Daily habit'],
    tagColors: ['#D1FAE5|#065F46','#DBEAFE|#1E40AF','#FEF3C7|#92400E'],
    impact: 88, effort: 25, moat: 55, speed: 98,
  },
  {
    id: 4, plan: 'active', phase: 'Fáza 2',
    name: 'Cross-portal arbitrage engine',
    desc: 'Automatická detekcia: ten istý byt na Bazoši za 94k a na nehnutelnosti.sk za 112k. Delta = zákazka.',
    icon: '🔀', tags: ['Unikátne SK','L99 Intel','Revenue direct'],
    tagColors: ['#DBEAFE|#1E40AF','#E0E7FF|#3730A3','#D1FAE5|#065F46'],
    impact: 92, effort: 55, moat: 90, speed: 75,
  },
  {
    id: 5, plan: 'active', phase: 'Fáza 2',
    name: 'Historical price trail — vyjednávacia zbraň',
    desc: 'Cena klesla z 105k na 94k za 90 dní. Predajca je motivovaný. Maklér to vie pred prvým telefonátom.',
    icon: '📉', tags: ['Data moat','Negotiation AI'],
    tagColors: ['#E0E7FF|#3730A3','#FEF3C7|#92400E'],
    impact: 85, effort: 30, moat: 88, speed: 88,
  },
  {
    id: 6, plan: 'active', phase: 'Fáza 2',
    name: 'Agent integrity monitor — ochrana databázy',
    desc: 'Maklér stiahne 200 kontaktov → owner dostane e-mail o 8:01. Databáza je najcennejšie čo kancelária má.',
    icon: '🛡️', tags: ['Owner-only','Churn prevention','Trust'],
    tagColors: ['#FEF3C7|#92400E','#FEE2E2|#991B1B','#D1FAE5|#065F46'],
    impact: 90, effort: 35, moat: 70, speed: 85,
  },
  {
    id: 7, plan: 'market', phase: 'Fáza 2',
    name: 'LV kataster live alert — first-mover SK',
    desc: 'Zmena plomby na liste vlastníctva → push notifikácia maklérovi do 6 hodín. Nikto iný v SR to nerobí.',
    icon: '🏛️', tags: ['First-mover','Unikátne SK','L99 Intel'],
    tagColors: ['#FEE2E2|#991B1B','#DBEAFE|#1E40AF','#E0E7FF|#3730A3'],
    impact: 88, effort: 60, moat: 95, speed: 70,
  },
  {
    id: 8, plan: 'market', phase: 'Fáza 3',
    name: 'Maklér reputačný profil — verejný certifikát',
    desc: 'Verejný profil: priemerná doba odpovede 8 min, uzatvorené obchody 47, BRI presnosť 82%.',
    icon: '🏆', tags: ['Brand moat','Viral','B2C bridge'],
    tagColors: ['#E0E7FF|#3730A3','#D1FAE5|#065F46','#DBEAFE|#1E40AF'],
    impact: 85, effort: 70, moat: 92, speed: 55,
  },
  {
    id: 9, plan: 'market', phase: 'Fáza 3',
    name: 'Ghost Resurrection 2.0 — BSM hook',
    desc: 'Dormantný lead + BSM reforma 2026 = najsilnejší reaktivačný trigger roku. 100% open rate.',
    icon: '👻', tags: ['BSM reforma','Ghost 2.0','First-mover'],
    tagColors: ['#FEF3C7|#92400E','#E0E7FF|#3730A3','#FEE2E2|#991B1B'],
    impact: 82, effort: 40, moat: 75, speed: 72,
  },
  {
    id: 10, plan: 'protocol', phase: 'Moat',
    name: 'Hyper-local demand heatmap — Prešov/Košice',
    desc: 'Vizualizácia kde kupujúci hľadajú vs kde sú byty. Gap = príležitosť. Developerí platia tisíce € ročne.',
    icon: '🗺️', tags: ['B2B data','Developer sales','Moat data'],
    tagColors: ['#FEF3C7|#92400E','#DBEAFE|#1E40AF','#E0E7FF|#3730A3'],
    impact: 80, effort: 80, moat: 97, speed: 50,
  },
  {
    id: 11, plan: 'protocol', phase: 'Moat',
    name: 'Competitor sleep detector',
    desc: 'AI monitoruje kedy konkurenčné RK nereagujú. Keď spia — maklér dostane alert: teraz je čas.',
    icon: '🔍', tags: ['Competitive Intel','Protocol only','Moat'],
    tagColors: ['#FEE2E2|#991B1B','#FEF3C7|#92400E','#E0E7FF|#3730A3'],
    impact: 78, effort: 75, moat: 95, speed: 45,
  },
  {
    id: 12, plan: 'protocol', phase: 'Moat',
    name: 'B2B data API — monetizácia dát',
    desc: 'Developerí, banky, poisťovne platia za price intelligence a LV change feeds. Revolis = dátová infraštruktúra.',
    icon: '🔌', tags: ['New revenue','API product','Moat'],
    tagColors: ['#D1FAE5|#065F46','#DBEAFE|#1E40AF','#E0E7FF|#3730A3'],
    impact: 90, effort: 90, moat: 99, speed: 35,
  },
  {
    id: 13, plan: 'protocol', phase: 'Moat',
    name: 'Ambient deal radar — AI keď maklér spí',
    desc: '02:00 — urgent predaj na Bazoši. 02:01 — push notifikácia. 08:00 — prvý na mieste. Competitor vie o 09:00.',
    icon: '📡', tags: ['24/7 watch','First-mover','Moat'],
    tagColors: ['#FEE2E2|#991B1B','#D1FAE5|#065F46','#E0E7FF|#3730A3'],
    impact: 86, effort: 50, moat: 88, speed: 65,
  },
  {
    id: 14, plan: 'protocol', phase: 'Moat',
    name: 'Revolis AI coaching — personalizovaný rozvoj',
    desc: 'Po 30 dňoch dát: "Tvojou slabinou je follow-up po 3. kontakte. Tu je 5 techník pre tvoj profil."',
    icon: '🎯', tags: ['Retention king','AI coaching','Premium'],
    tagColors: ['#D1FAE5|#065F46','#E0E7FF|#3730A3','#FEF3C7|#92400E'],
    impact: 82, effort: 65, moat: 93, speed: 40,
  },
]
