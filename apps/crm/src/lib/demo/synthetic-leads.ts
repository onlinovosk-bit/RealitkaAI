import type { Lead, LeadStatus } from "@/lib/mock-data";

/** Deterministický PRNG (Mulberry32). */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

const LOCATIONS = [
  "Bratislava - Ružinov",
  "Bratislava - Petržalka",
  "Bratislava - Nové Mesto",
  "Bratislava - Karlova Ves",
  "Košice - Juh",
  "Prešov",
  "Žilina",
  "Banská Bystrica",
  "Trnava",
  "Trenčín",
  "Nitra",
  "Martin",
  "Poprad",
  "Zvolen",
  "Pezinok",
  "Piešťany",
  "Liptovský Mikuláš",
  "Ružomberok",
  "Dunajská Streda",
];

const FIRST_M = [
  "Ján",
  "Peter",
  "Marek",
  "Martin",
  "Tomáš",
  "Filip",
  "Igor",
  "Lukáš",
  "Michal",
  "Richard",
];
const FIRST_F = [
  "Petra",
  "Simona",
  "Lucia",
  "Zuzana",
  "Eva",
  "Katarína",
  "Andrea",
  "Veronika",
  "Mária",
  "Jana",
];
const LAST = [
  "Kováč",
  "Novák",
  "Tóth",
  "Horváth",
  "Varga",
  "Nagy",
  "Molnár",
  "Baláž",
  "Šimko",
  "Králik",
];

const SOURCES = [
  "Web formulár",
  "Facebook Ads",
  "Google Ads",
  "Chatbot",
  "Odporúčanie",
  "Portál",
] as const;

const TIMELINES = [
  "Ihneď",
  "Do 1 mesiaca",
  "Do 2 mesiacov",
  "Do 3 mesiacov",
  "Do 6 mesiacov",
] as const;

const FINANCING = ["Hypotéka", "Hotovosť", "Kombinácia"] as const;
const ROOMS_OPTS = ["1 izba", "2 izby", "3 izby", "4 izby", "5+ izby"] as const;
const PROP_TYPES = ["Byt", "Dom", "Pozemok", "Komerčný priestor"] as const;

const AGENTS = [
  "Lucia Hrivnáková",
  "Tomáš Krištof",
  "Nepriradený",
  "Jana Novotná",
  "Peter Malina",
];

const LAST_CONTACT = [
  "Dnes 09:20",
  "Dnes 14:05",
  "Včera 16:45",
  "Včera 10:05",
  "Pred 2 dňami",
  "Pred 3 dňami",
  "Pred týždňom",
  "Práve vytvorený",
];

const SEGMENTS = [
  "first_time_buyer",
  "investor",
  "relocator",
  "other",
  null,
] as const;

/** Pipeline — podobne ako pri nehnuteľnostiach zmiešané fázy. */
function pickStatus(rng: () => number): LeadStatus {
  const r = rng();
  if (r < 0.22) return "Nový";
  if (r < 0.44) return "Teplý";
  if (r < 0.64) return "Horúci";
  if (r < 0.82) return "Obhliadka";
  return "Ponuka";
}

function budgetText(rng: () => number): string {
  if (rng() < 0.08) {
    const rent = 400 + Math.floor(rng() * 900);
    return `${rent} € mesačne`;
  }
  const euros = 85_000 + Math.floor(rng() * 435_000);
  return `${euros.toLocaleString("sk-SK")} €`.replace(/\u00a0/g, " ");
}

function noteFor(
  status: LeadStatus,
  location: string,
  propertyType: string,
  rng: () => number
): string {
  const snippets: Record<LeadStatus, string[]> = {
    Nový: [
      `Nový záujem z ${location}, preferuje ${propertyType.toLowerCase()}.`,
      `Kontaktovať s ponukou vhodných inzerátov v okolí ${location}.`,
    ],
    Teplý: [
      `Reagoval na newsletter, čaká na výber ${propertyType.toLowerCase()}.`,
      `Druhý kontakt — zaujíma sa o ${location}.`,
    ],
    Horúci: [
      `Schválený úver / rozpočet, chce riešiť obhliadku do týždňa.`,
      `Aktívne hľadá v lokalite ${location}.`,
    ],
    Obhliadka: [
      `Obhliadka dohodnutá — potvrdiť čas a prístup.`,
      `Klient si vybral variant, čaká na spätnú väzbu po obhliadke.`,
    ],
    Ponuka: [
      `Cenová ponuka odoslaná, sledovať reakciu protistrany.`,
      `Vyjednávanie — držať kontakt a termíny.`,
    ],
  };
  return pick(rng, snippets[status]);
}

/**
 * Generuje realistické demo leady (SK), zmiešaný pipeline a skóre.
 * `seed` zabezpečí stabilitu medzi behmi.
 */
export function generateSyntheticLeads(count: number, seed = 1337): Lead[] {
  const rng = mulberry32(seed);
  const out: Lead[] = [];

  for (let i = 0; i < count; i++) {
    const female = rng() < 0.48;
    const first = female ? pick(rng, FIRST_F) : pick(rng, FIRST_M);
    const last = pick(rng, LAST);
    const name = `${first} ${last}`;
    const email = `demo.lead.${seed}.${i}@example.invalid`;
    const phone = `+421 9${Math.floor(10 + rng() * 89)} ${String(Math.floor(100 + rng() * 900)).padStart(3, "0")} ${String(Math.floor(100 + rng() * 900)).padStart(3, "0")}`;

    const location = pick(rng, LOCATIONS);
    const propertyType = pick(rng, PROP_TYPES);
    const rooms =
      propertyType === "Pozemok"
        ? "—"
        : propertyType === "Komerčný priestor"
          ? pick(rng, ["open space", "kancelárie", "obchodné priestory"] as const)
          : pick(rng, ROOMS_OPTS);

    const status = pickStatus(rng);
    let score = 38 + Math.floor(rng() * 58);
    if (status === "Ponuka" || status === "Obhliadka") score = Math.max(score, 72);
    if (status === "Nový") score = Math.min(score, 68);

    const buyerReadiness = Math.min(100, Math.max(0, score + Math.floor((rng() - 0.5) * 16)));

    const seg = pick(rng, SEGMENTS);

    out.push({
      id: `demo-syn-lead-${seed}-${i}`,
      name,
      email,
      phone,
      location,
      budget: budgetText(rng),
      propertyType,
      rooms,
      financing: pick(rng, FINANCING),
      timeline: pick(rng, TIMELINES),
      source: pick(rng, SOURCES),
      status,
      score,
      assignedAgent: pick(rng, AGENTS),
      assignedProfileId: null,
      lastContact: pick(rng, LAST_CONTACT),
      note: `${noteFor(status, location, propertyType, rng)} Demo záznam Revolis (syntetická história).`,
      client_segment: seg,
      buyer_readiness_score: buyerReadiness,
    });
  }

  return out;
}
