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
];

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
