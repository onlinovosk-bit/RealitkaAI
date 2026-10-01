/** Map location text → city anchor or NBS region code in regional-prices.json */

/** Same NFD fold as apps/crm/src/lib/arbitrage/normalise.ts (normaliseStreet). */
export function foldDiacritics(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** City anchors — matched before kraje / SK. Longer keys first for includes(). */
const CITY_ANCHORS: Array<{ key: string; aliases: string[]; label: string }> = [
  { key: "michalovce", aliases: ["michalovce"], label: "Michalovce" },
  { key: "humenne", aliases: ["humenne"], label: "Humenné" },
  { key: "presov", aliases: ["presov"], label: "Prešov" },
  { key: "poprad", aliases: ["poprad"], label: "Poprad" },
];

const CITY_TO_REGION: Record<string, string> = {
  bratislava: "BA",
  kosice: "KE",
  trebisov: "KE",
  bardejov: "PO",
  snina: "PO",
  trnava: "TT",
  nitra: "NR",
  zilina: "ZA",
  trencin: "TN",
  banska: "BB",
  zvolen: "BB",
};

const REGION_LABELS: Record<string, string> = {
  SK: "Slovensko",
  BA: "Bratislavský kraj",
  KE: "Košický kraj",
  PO: "Prešovský kraj",
  TT: "Trnavský kraj",
  NR: "Nitriansky kraj",
  TN: "Trenčiansky kraj",
  ZA: "Žilinský kraj",
  BB: "Banskobystrický kraj",
};

export type PriceSource = "city" | "region" | "national" | "none";

export type ResolvedLocation = {
  regionCode: string;
  regionLabel: string;
  /** Hint from location parse; lookup may still downgrade region→national. */
  matchKind: "city" | "region" | "national";
};

/** Kraj adjectives that contain a city stem (e.g. prešovský ⊃ prešov) — match before city anchors. */
const REGION_PHRASE_TO_CODE: Array<{ needle: string; code: string }> = [
  { needle: "presovsky", code: "PO" },
  { needle: "kosicky", code: "KE" },
  { needle: "bratislavsky", code: "BA" },
  { needle: "trnavsky", code: "TT" },
  { needle: "nitriansky", code: "NR" },
  { needle: "trenciansky", code: "TN" },
  { needle: "zilinsky", code: "ZA" },
  { needle: "banskobystricky", code: "BB" },
];

export function resolveRegionFromLocation(location: string): ResolvedLocation {
  const folded = foldDiacritics(location);

  for (const phrase of REGION_PHRASE_TO_CODE) {
    if (folded.includes(phrase.needle)) {
      return {
        regionCode: phrase.code,
        regionLabel: REGION_LABELS[phrase.code] ?? phrase.code,
        matchKind: "region",
      };
    }
  }

  for (const city of CITY_ANCHORS) {
    if (city.aliases.some((alias) => folded.includes(alias))) {
      return {
        regionCode: city.key,
        regionLabel: city.label,
        matchKind: "city",
      };
    }
  }

  for (const [city, code] of Object.entries(CITY_TO_REGION)) {
    if (folded.includes(city)) {
      return {
        regionCode: code,
        regionLabel: REGION_LABELS[code] ?? code,
        matchKind: "region",
      };
    }
  }

  return {
    regionCode: "SK",
    regionLabel: REGION_LABELS.SK,
    matchKind: "national",
  };
}
