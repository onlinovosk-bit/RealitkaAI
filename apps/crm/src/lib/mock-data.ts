import type { AiEngineSnapshot } from "@/lib/ai/ai-engine-types";
import type { AiActivityFeedItem } from "@/lib/app-mode-types";
import type { Property } from "@/lib/properties-store";
import { getMatchingLeadsForProperty } from "@/lib/matching";

export type LeadStatus = "Nový" | "Teplý" | "Horúci" | "Obhliadka" | "Ponuka";

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  budget: string;
  propertyType: string;
  rooms: string;
  financing: string;
  timeline: string;
  source: string;
  status: LeadStatus;
  score: number;
  assignedAgent: string;
  assignedProfileId?: string | null;
  lastContact: string;
  note: string;
  client_segment?: string | null;
  buyer_readiness_score?: number | null;
  ai_insight?: string | null;
  sofia_insight?: string | null;
  /** AI Sales Brain v2 snapshot (Supabase `ai_engine` jsonb). */
  ai_engine?: AiEngineSnapshot | null;
};

export type Activity = {
  id: string;
  leadId: string;
  type: "Email" | "Telefonát" | "Poznámka" | "Obhliadka";
  text: string;
  date: string;
};

export type Recommendation = {
  id: string;
  leadId: string;
  title: string;
  description: string;
  priority: "Vysoká" | "Stredná" | "Nízka";
};

export const leads: Lead[] = [
  {
    id: "1",
    name: "Martin Kováč",
    email: "martin.kovac@email.com",
    phone: "+421 901 111 222",
    location: "Bratislava - Ružinov",
    budget: "280 000 ?",
    propertyType: "Byt",
    rooms: "3 izby",
    financing: "Hypotéka",
    timeline: "Do 2 mesiacov",
    source: "Facebook Ads",
    status: "Horúci",
    score: 91,
    assignedAgent: "Lucia Hrivnáková",
    assignedProfileId: "33333333-3333-3333-3333-333333333331",
    lastContact: "Dnes 09:20",
    note: "Klient má schválenú hypotéku a chce riešiť obhliadku tento týždeň.",
  },
  {
    id: "2",
    name: "Petra Nováková",
    email: "petra.novakova@email.com",
    phone: "+421 902 333 444",
    location: "Trnava",
    budget: "190 000 ?",
    propertyType: "Byt",
    rooms: "2 izby",
    financing: "Hotovosť",
    timeline: "Do 1 mesiaca",
    source: "Web formulár",
    status: "Teplý",
    score: 76,
    assignedAgent: "Tomáš Krištof",
    assignedProfileId: "33333333-3333-3333-3333-333333333332",
    lastContact: "Včera 16:45",
    note: "Klientka reagovala na 2 ponuky, potrebuje balkón a parkovanie.",
  },
  {
    id: "3",
    name: "Ján Mráz",
    email: "jan.mraz@email.com",
    phone: "+421 903 555 666",
    location: "Nitra",
    budget: "320 000 ?",
    propertyType: "Dom",
    rooms: "4 izby",
    financing: "Hypotéka",
    timeline: "Do 3 mesiacov",
    source: "Chatbot",
    status: "Nový",
    score: 63,
    assignedAgent: "Lucia Hrivnáková",
    assignedProfileId: "33333333-3333-3333-3333-333333333331",
    lastContact: "Pred 3 dňami",
    note: "Hľadá rodinný dom s pozemkom, preferuje tichú lokalitu.",
  },
  {
    id: "4",
    name: "Simona Vargová",
    email: "simona.vargova@email.com",
    phone: "+421 904 777 888",
    location: "Bratislava - Nové Mesto",
    budget: "240 000 ?",
    propertyType: "Byt",
    rooms: "2 izby",
    financing: "Hotovosť",
    timeline: "Ihneď",
    source: "Odporúčanie",
    status: "Obhliadka",
    score: 88,
    assignedAgent: "Tomáš Krištof",
    assignedProfileId: "33333333-3333-3333-3333-333333333332",
    lastContact: "Dnes 11:10",
    note: "Obhliadka naplánovaná na štvrtok o 17:00.",
  },
  {
    id: "5",
    name: "Marek Šulc",
    email: "marek.sulc@email.com",
    phone: "+421 905 999 000",
    location: "Bratislava - Petržalka",
    budget: "210 000 ?",
    propertyType: "Byt",
    rooms: "3 izby",
    financing: "Hypotéka",
    timeline: "Do 4 mesiacov",
    source: "Google Ads",
    status: "Ponuka",
    score: 82,
    assignedAgent: "Lucia Hrivnáková",
    assignedProfileId: "33333333-3333-3333-3333-333333333331",
    lastContact: "Včera 10:05",
    note: "Klient dostal cenovú ponuku a čaká na reakciu predávajúceho.",
  },
  {
    id: "6",
    name: "Lucia Petrášová",
    email: "lucia.petrasova@email.com",
    phone: "+421 906 111 222",
    location: "Poprad",
    budget: "950 € mesačne",
    propertyType: "Byt",
    rooms: "3 izby",
    financing: "Hypotéka",
    timeline: "Do 1 mesiaca",
    source: "Bazoš",
    status: "Horúci",
    score: 92,
    assignedAgent: "Lucia Hrivnáková",
    assignedProfileId: "33333333-3333-3333-3333-333333333331",
    lastContact: "Dnes 08:40",
    note: "Prenájom Poprad Západ alebo centrum; potrebuje balkón. Max 950 € vrátane energií.",
    buyer_readiness_score: 91,
  },
  {
    id: "7",
    name: "Tomáš Hanc",
    email: "tomas.hanc@email.com",
    phone: "+421 907 444 555",
    location: "Poprad - Starý Juh",
    budget: "110 000 €",
    propertyType: "Byt",
    rooms: "2 izby",
    financing: "Hypotéka",
    timeline: "Do 6 mesiacov",
    source: "Nehnuteľnosti.sk",
    status: "Teplý",
    score: 71,
    assignedAgent: "Tomáš Krištof",
    assignedProfileId: "33333333-3333-3333-3333-333333333332",
    lastContact: "Včera",
    note: "Kúpa menšieho bytu v Poprade – prenájom len dočasne.",
    buyer_readiness_score: 62,
  },
];

/**
 * Zlatý testovací inzerát: 3-izb. byt Štúrova, Poprad-Západ, prenájom 704 € vrátane energií, 68 m².
 * Zdroj inšpirácie: organické listingy (Bazoš / Nehnuteľnosti).
 */
export const GOLD_STANDARD_POPRAD_STUROVA_3I: Property = {
  id: "poprad-sturova-3i-gold",
  agencyId: null,
  title: "3-izb. byt, Štúrova — Poprad (Západ)",
  location: "Poprad - Západ, Štúrova",
  price: 704,
  type: "Byt",
  rooms: "3 izby",
  features: ["balkón", "parking", "68 m²", "prenájom"],
  status: "Aktívna",
  description:
    "Prenájom 704 €/mes vrátane energií · 68 m² · 3 izby · lokalita Poprad-Západ (Štúrova). Referenčná ponuka pre matching engine a BRI.",
  ownerName: "",
  ownerPhone: "",
};

/**
 * Odhad Buyer Readiness Index pre zlatý listing (konkurenčná cena + lokalita Poprad-Západ).
 * Nie je uložené v DB — výhradne mock / UI.
 */
export function estimatePopradGoldListingBri(): number {
  return 87;
}

/**
 * Simulácia: leady z `leads` s zhodou na zlatý byt nad prahem (default 90 %).
 */
export function runPopradGoldMatchingSimulation(minScore = 90) {
  return getMatchingLeadsForProperty(GOLD_STANDARD_POPRAD_STUROVA_3I, leads, minScore);
}

export const activities: Activity[] = [
  {
    id: "a1",
    leadId: "1",
    type: "Email",
    text: "Odoslané 3 matching ponuky v Ružinove.",
    date: "Dnes 09:30",
  },
  {
    id: "a2",
    leadId: "1",
    type: "Telefonát",
    text: "Telefonát potvrdený, klient chce obhliadku vo štvrtok.",
    date: "Dnes 10:15",
  },
  {
    id: "a3",
    leadId: "1",
    type: "Poznámka",
    text: "Silný záujem, preferuje novostavbu s balkónom.",
    date: "Dnes 10:40",
  },
  {
    id: "a4",
    leadId: "2",
    type: "Email",
    text: "Poslaný follow-up s dvoma novými bytmi.",
    date: "Včera 16:50",
  },
  {
    id: "a5",
    leadId: "4",
    type: "Obhliadka",
    text: "Obhliadka naplánovaná na štvrtok 17:00.",
    date: "Dnes 11:10",
  },
];

export const recommendations: Recommendation[] = [
  {
    id: "r1",
    leadId: "1",
    title: "Kontaktovať dnes",
    description: "Lead má vysoké skóre a reálnu šancu prejsť na obhliadku ešte dnes.",
    priority: "Vysoká",
  },
  {
    id: "r2",
    leadId: "1",
    title: "Poslať 2 nové byty",
    description: "Doplniť matching o novostavby v Ružinove s balkónom.",
    priority: "Vysoká",
  },
  {
    id: "r3",
    leadId: "2",
    title: "Follow-up do 24 hodín",
    description: "Klientka reagovala, ale ešte nepotvrdila obhliadku.",
    priority: "Stredná",
  },
  {
    id: "r4",
    leadId: "3",
    title: "Prekvalifikovať lead",
    description: "Overiť časový horizont a financovanie, lead je zatiaľ nejasný.",
    priority: "Nízka",
  },
  {
    id: "r5",
    leadId: "4",
    title: "Potvrdiť obhliadku SMS",
    description: "Pripomienka 24 hodín pred termínom zvýši dochádzku.",
    priority: "Stredná",
  },
];

export function getLeadById(id: string) {
  return leads.find((lead) => lead.id === id);
}

export function getActivitiesByLeadId(leadId: string) {
  return activities.filter((activity) => activity.leadId === leadId);
}

export function getRecommendationsByLeadId(leadId: string) {
  return recommendations.filter((item) => item.leadId === leadId);
}

/** Demo režim: vysoké skóre, silné BRI, „perfektné“ pipeline dáta pre obchodný pitch. */
export function getDemoShowcaseLeads(): Lead[] {
  return leads.map((lead, i) => ({
    ...lead,
    score: Math.min(99, 94 + (i % 5)),
    status: (i % 3 === 0 ? "Horúci" : i % 3 === 1 ? "Obhliadka" : "Ponuka") as LeadStatus,
    buyer_readiness_score: Math.min(99, 88 + (i % 10)),
    note: `${lead.note} Revolis demo: optimalizovaný matching profil.`,
  }));
}

export function getDemoShowcaseRecommendations(): Recommendation[] {
  return recommendations.map((r) => ({
    ...r,
    priority: "Vysoká" as const,
    description: `${r.description} (demo: AI priorita zvýšená)`,
  }));
}

/** Statický seed pre AI Activity Feed (dopĺňa sa live cez SSE na dashboarde). */
export function getAiActivityFeedSeed(): AiActivityFeedItem[] {
  return [
    {
      id: "feed-organic-poprad-sturova",
      activityType: "market_scan",
      title: "Nový organický inzerát (Bazoš / Nehnuteľnosti)",
      body: `New organic listing detected from Bazoš/Nehnutelnosti. Analyzing matches for Property ID: Poprad-Sturova-3i-gold. Odhad BRI: ${estimatePopradGoldListingBri()}/100 (konkurenčná cena v segmente Poprad-Západ).`,
      createdAt: "2026-04-12T07:45:00.000Z",
      meta: {
        propertyId: "poprad-sturova-3i-gold",
        region: "Poprad-Západ",
        briEstimate: estimatePopradGoldListingBri(),
      },
    },
    {
      id: "feed-match-1",
      activityType: "matching",
      title: "AI matched Lead #452 → Property X",
      body: "Vektorová zhoda lokality a rozpočtu; skóre 98 % oproti priemeru tímu 72 %.",
      createdAt: "2026-04-12T06:12:00.000Z",
      meta: { leadId: "452", matchScore: 98, propertyLabel: "Property X" },
    },
    {
      id: "feed-ghost-1",
      activityType: "ghosting_recovery",
      title: "Ghosting Recovery: Mr. Smith",
      body: "Model detegoval 9 dní bez odozvy; koncept e-mailu s mäkkým follow-upom a novou ponukou pripravený na odoslanie.",
      createdAt: "2026-04-12T05:48:00.000Z",
      meta: { leadName: "Mr. Smith", daysSilent: 9 },
    },
    {
      id: "feed-bri-1",
      activityType: "bri_regional",
      title: "BRI ↑ v Bratislave",
      body: "Buyer Readiness Index vzrástol u 12 leadov v Bratislave po vlne obhliadok a telefonátov.",
      createdAt: "2026-04-12T05:20:00.000Z",
      meta: { region: "Bratislava", leadCount: 12 },
    },
    {
      id: "feed-scan-1",
      activityType: "market_scan",
      title: "Nočný market scan",
      body: "Porovnanie inventára vs. dopyt: 3 nové hot-zóny s nedostatkom 3-izbových bytov pod 300k.",
      createdAt: "2026-04-12T04:00:00.000Z",
      meta: { zones: 3 },
    },
  ];
}
