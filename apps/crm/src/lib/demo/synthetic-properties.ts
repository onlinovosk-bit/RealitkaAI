import type { Property } from "@/lib/properties-store";

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
  "Bratislava - Lamač",
  "Košice - Juh",
  "Košice - Sever",
  "Prešov",
  "Žilina",
  "Banská Bystrica",
  "Trnava",
  "Trenčín",
  "Nitra",
  "Martin",
  "Poprad",
  "Poprad - Západ",
  "Zvolen",
  "Považská Bystrica",
  "Prievidza",
  "Lučenec",
  "Senica",
  "Levice",
  "Komárno",
  "Humenné",
  "Bardejov",
  "Pezinok",
  "Malacky",
  "Galanta",
  "Šaľa",
  "Partizánske",
  "Piešťany",
  "Topoľčany",
  "Dunajská Streda",
  "Michalovce",
  "Rožňava",
  "Liptovský Mikuláš",
  "Ružomberok",
  "Čadca",
  "Kysucké Nové Mesto",
  "Snina",
  "Svidník",
];

const TYPES = ["Byt", "Dom", "Pozemok", "Komerčný priestor"] as const;
const ROOMS_OPTS = ["1 izba", "2 izby", "3 izby", "4 izby", "5+ izby"] as const;

const FEATURE_POOL = [
  "balkón",
  "loggia",
  "garáž",
  "parkovanie",
  "novostavba",
  "rekonštrukcia",
  "záhrada",
  "pivnica",
  "výťah",
  "klimatizácia",
  "centrum",
  "tichá lokalita",
  "investičná príležitosť",
];

const FIRST = [
  "Ján",
  "Peter",
  "Marek",
  "Martin",
  "Tomáš",
  "Filip",
  "Igor",
  "Lukáš",
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
];

/** Rozdelenie stavov — pôsobí ako dlhoročná agenda (veľa uzavretých obchodov). */
function pickStatus(rng: () => number): string {
  const r = rng();
  if (r < 0.34) return "Aktívna";
  if (r < 0.46) return "Rezervovaná";
  if (r < 0.82) return "Predaná";
  return "Stiahnutá";
}

function priceForType(type: string, rng: () => number): number {
  const spread = (min: number, max: number) =>
    Math.round(min + rng() * (max - min));

  switch (type) {
    case "Byt":
      return spread(118_000, 520_000);
    case "Dom":
      return spread(195_000, 890_000);
    case "Pozemok":
      return spread(28_000, 320_000);
    case "Komerčný priestor":
      return spread(75_000, 980_000);
    default:
      return spread(150_000, 400_000);
  }
}

function typeFromRng(rng: () => number): string {
  const r = rng();
  if (r < 0.48) return "Byt";
  if (r < 0.74) return "Dom";
  if (r < 0.9) return "Pozemok";
  return "Komerčný priestor";
}

/**
 * Generuje realistické demo nehnuteľnosti (SK lokality, zmiešané stavy).
 * `seed` zabezpečí stabilitu medzi buildmi.
 */
export function generateSyntheticProperties(count: number, seed = 1337): Property[] {
  const rng = mulberry32(seed);
  const out: Property[] = [];

  for (let i = 0; i < count; i++) {
    const type = typeFromRng(rng);
    const location = pick(rng, LOCATIONS);
    const rooms =
      type === "Pozemok"
        ? "—"
        : type === "Komerčný priestor"
          ? pick(rng, ["open space", "kancelárie", "obchodné priestory"])
          : pick(rng, ROOMS_OPTS);

    const nf = 2 + Math.floor(rng() * 3);
    const feats = new Set<string>();
    for (let f = 0; f < nf; f++) feats.add(pick(rng, FEATURE_POOL));

    const price = priceForType(type, rng);
    const status = pickStatus(rng);

    const shortLoc = location.split(" - ")[0] ?? location;
    const title =
      type === "Pozemok"
        ? `Pozemok ${shortLoc} · ${Math.round(300 + rng() * 2200)} m²`
        : `${rooms !== "—" ? rooms.replace("izby", "izb.") : ""} ${type} ${location}`.trim();

    const ownerName = `${pick(rng, FIRST)} ${pick(rng, LAST)}`;
    const phone = `+421 9${Math.floor(10 + rng() * 89)} ${String(Math.floor(100 + rng() * 900)).padStart(3, "0")} ${String(Math.floor(100 + rng() * 900)).padStart(3, "0")}`;

    out.push({
      id: `demo-syn-${seed}-${i}`,
      agencyId: null,
      title: title.slice(0, 200),
      location,
      price,
      type,
      rooms: rooms === "—" ? "—" : rooms,
      features: [...feats],
      status,
      description: `${type} v lokalite ${location}. Stav: ${status}. Demo záznam Revolis (syntetická história).`,
      ownerName,
      ownerPhone: phone,
    });
  }

  return out;
}
