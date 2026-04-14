/**
 * Generátor realistických demo dát pre Revolis.AI simulator.
 * Používa naše skutočné typy aktivít z BRI engine.
 */

// Mapovanie na typy aktivít z Supabase activities tabuľky
export type SimActivityType =
  | "Obhliadka"
  | "Telefonát"
  | "Email"
  | "Poznámka"
  | "Lead";

export interface SimEvent {
  id: string;
  buyerName: string;
  email: string;
  property: string;
  type: SimActivityType;
  occurredAt: Date;
}

const NAMES = [
  "Ján Novák",
  "Petra Kováčová",
  "Marek Šimko",
  "Lucia Šoltésová",
  "Tomáš Bielik",
  "Zuzana Šimková",
  "Roman Kubiš",
  "Anna Hrivnáková",
  "Milan Krajčír",
  "Veronika Hrušková",
  "Peter Švec",
  "Simona Lacková",
];

const PROPERTIES = [
  "3-izbový byt, Ružinov",
  "4-izbový byt, Staré Mesto",
  "Novostavba Slnečnice",
  "Rodinný dom, Lamač",
  "2-izbový byt, Račianska",
  "Penthouse, Koliba",
];

// Váhované typy – obhliadky sú vzácnejšie ako emaily
const ACTIVITY_POOL: SimActivityType[] = [
  "Lead",
  "Lead",
  "Email",
  "Email",
  "Email",
  "Telefonát",
  "Telefonát",
  "Obhliadka",
  "Poznámka",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function emailFrom(name: string): string {
  return `${name.toLowerCase().replace(/\s+/g, ".")}@demo.com`;
}

/**
 * Generuje náhodné udalosti pre demo / seed účely.
 * @param count - počet udalostí
 * @param daysBack - koľko dní dozadu siahajú udalosti (default 30)
 */
export function generateRandomEvents(
  count: number,
  daysBack = 30
): SimEvent[] {
  return Array.from({ length: count }, (_, i) => {
    const name = pick(NAMES);
    return {
      id: `ev-${i}`,
      buyerName: name,
      email: emailFrom(name),
      property: pick(PROPERTIES),
      type: pick(ACTIVITY_POOL),
      occurredAt: new Date(
        Date.now() - Math.random() * 1000 * 60 * 60 * 24 * daysBack
      ),
    };
  });
}

/**
 * Zoskupí udalosti podľa kupujúceho (mena/emailu).
 * Vracia mapu email → { name, events[] }
 */
export function groupEventsByBuyer(
  events: SimEvent[]
): Map<string, { name: string; events: SimEvent[] }> {
  const map = new Map<string, { name: string; events: SimEvent[] }>();
  for (const ev of events) {
    const existing = map.get(ev.email) ?? { name: ev.buyerName, events: [] };
    existing.events.push(ev);
    map.set(ev.email, existing);
  }
  return map;
}
