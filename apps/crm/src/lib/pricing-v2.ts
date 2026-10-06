/**
 * Cenník v2 — paušál na kanceláriu podľa počtu používateľov (W1).
 *
 * Všetky sumy sú v CENTOCH a BEZ DPH. Konečná cena sa počíta zo základu a sadzby DPH;
 * základ sa pri zmene sadzby nemení. Grant kreditov patrí kancelárii, nie používateľovi.
 *
 * ZATIAĽ NIE JE zapojený do checkoutu, webhooku ani grantov (to je W2) a `isPricingV2Enabled()`
 * je predvolene vypnuté. Staré seat ceny v `program-tier-pricing.ts` ostávajú nedotknuté.
 * Zdroj čísel: docs/architecture/2026-10-05-mega-poplach-airamax-roadmap.md §9.5,
 * docs/pricing/2026-10-05-pricing-v2-w0-inventory.md.
 */

export const PRICING_V2_VAT_PERCENT_DEFAULT = 23;

export const PRICING_V2_BAND_IDS = ["start", "team", "office", "network"] as const;
export type PricingV2BandId = (typeof PRICING_V2_BAND_IDS)[number];

export type PricingV2Band = {
  id: PricingV2BandId;
  label: string;
  minUsers: number;
  /** null = bez hornej hranice */
  maxUsers: number | null;
  /** mesačná cena v centoch bez DPH */
  netCents: number;
  /** true = „od“ cena (pásmo Sieť sa dojednáva podľa objemu) */
  isFromPrice: boolean;
  /** mesačný grant kreditov pre celú kanceláriu */
  monthlyCredits: number;
};

/** Zmrazí zoznam aj jeho položky, aby cenník nešlo za behu potichu prepísať. */
function freezeList<T extends object>(items: T[]): readonly T[] {
  return Object.freeze(items.map((item) => Object.freeze({ ...item })));
}

export const PRICING_V2_BANDS: readonly PricingV2Band[] = freezeList<PricingV2Band>([
  { id: "start", label: "Start", minUsers: 1, maxUsers: 1, netCents: 2500, isFromPrice: false, monthlyCredits: 20 },
  { id: "team", label: "Team", minUsers: 2, maxUsers: 6, netCents: 6000, isFromPrice: false, monthlyCredits: 50 },
  { id: "office", label: "Kancelária", minUsers: 7, maxUsers: 25, netCents: 14900, isFromPrice: false, monthlyCredits: 100 },
  { id: "network", label: "Sieť", minUsers: 26, maxUsers: null, netCents: 34900, isFromPrice: true, monthlyCredits: 150 },
]);

/** Fakturačné obdobie plánu. Ročné platenie je len plán (balíky kreditov sú mesačné a s ročným plánom sa nemiešajú). */
export const PRICING_V2_INTERVALS = ["month", "year"] as const;
export type PricingV2Interval = (typeof PRICING_V2_INTERVALS)[number];

/**
 * Ročná cena = 12 × mesačná (rozhodnutie foundera 6. 10. 2026: ročné platenie BEZ zľavy).
 * Kredity sa pri ročnom pláne prideľujú naďalej MESAČNE (rovnaký grant ako pri mesačnom pláne).
 */
export const PRICING_V2_ANNUAL_MONTHS = 12;

export function annualNetCents(monthlyNetCents: number): number {
  assertNetCents(monthlyNetCents);
  const annual = monthlyNetCents * PRICING_V2_ANNUAL_MONTHS;
  if (!Number.isSafeInteger(annual)) throw new RangeError(`Ročný základ ceny nie je bezpečné celé číslo: ${annual}`);
  return annual;
}

export function isPricingV2Interval(value: unknown): value is PricingV2Interval {
  return value === "month" || value === "year";
}

/** Samostatne dokúpený kredit (bez balíka), bez DPH. */
export const PRICING_V2_CREDIT_NET_CENTS = 70;

export type PricingV2Pack = {
  /** kreditov mesačne (opakované predplatné navyše k plánu) */
  credits: number;
  /** mesačná cena v centoch bez DPH */
  netCents: number;
};

export const PRICING_V2_MONTHLY_PACKS: readonly PricingV2Pack[] = freezeList<PricingV2Pack>([
  { credits: 60, netCents: 3400 },
  { credits: 120, netCents: 6200 },
  { credits: 180, netCents: 8600 },
  { credits: 240, netCents: 10800 },
  { credits: 300, netCents: 12900 },
]);

export type PricingV2BandResult =
  | { ok: true; band: PricingV2Band }
  | { ok: false; reason: "invalid_user_count" };

/** Počet používateľov → pásmo. Nulový, záporný, desatinný alebo nekonečný počet nevyberie nič. */
export function resolvePricingV2Band(users: number): PricingV2BandResult {
  if (typeof users !== "number" || !Number.isSafeInteger(users) || users < 1) {
    return { ok: false, reason: "invalid_user_count" };
  }
  const band = PRICING_V2_BANDS.find(
    (b) => users >= b.minUsers && (b.maxUsers === null || users <= b.maxUsers),
  );
  return band ? { ok: true, band } : { ok: false, reason: "invalid_user_count" };
}

function assertVatPercent(vatPercent: number): void {
  // Horná hranica 100 % je len poistka proti zjavne chybnému vstupu (napr. 1e9), nie daňové pravidlo.
  if (typeof vatPercent !== "number" || !Number.isFinite(vatPercent) || vatPercent < 0 || vatPercent > 100) {
    throw new RangeError(`Neplatná sadzba DPH: ${vatPercent}`);
  }
}

function assertNetCents(netCents: number): void {
  if (typeof netCents !== "number" || !Number.isSafeInteger(netCents) || netCents < 0) {
    throw new RangeError(`Neplatný základ ceny v centoch: ${netCents}`);
  }
}

/** Konečná cena v centoch zo základu bez DPH (zaokrúhlené na cent). */
export function grossCentsFromNet(netCents: number, vatPercent: number = PRICING_V2_VAT_PERCENT_DEFAULT): number {
  assertNetCents(netCents);
  assertVatPercent(vatPercent);
  return Math.round((netCents * (100 + vatPercent)) / 100);
}

export type PricingV2Amount = {
  netCents: number;
  vatCents: number;
  grossCents: number;
};

export function priceFromNetCents(netCents: number, vatPercent: number = PRICING_V2_VAT_PERCENT_DEFAULT): PricingV2Amount {
  const grossCents = grossCentsFromNet(netCents, vatPercent);
  return { netCents, vatCents: grossCents - netCents, grossCents };
}

/** Cena samostatne dokúpených kreditov; neplatný počet vráti null. */
export function priceExtraCredits(
  credits: number,
  vatPercent: number = PRICING_V2_VAT_PERCENT_DEFAULT,
): PricingV2Amount | null {
  if (typeof credits !== "number" || !Number.isSafeInteger(credits) || credits < 1) return null;
  // Suma musí ostať presná na cent; inak by sa zaúčtovala zaokrúhlená hodnota.
  if (!Number.isSafeInteger(credits * PRICING_V2_CREDIT_NET_CENTS)) return null;
  return priceFromNetCents(credits * PRICING_V2_CREDIT_NET_CENTS, vatPercent);
}

/** Grant patrí kancelárii: nezávisí od počtu používateľov v rámci pásma. */
export function monthlyOfficeGrantCredits(bandId: PricingV2BandId): number {
  const band = PRICING_V2_BANDS.find((b) => b.id === bandId);
  if (!band) throw new RangeError(`Neznáme pásmo: ${bandId}`);
  return band.monthlyCredits;
}

/** Predvolene VYPNUTÉ; zapína len výslovné `true` / `1` / `on`. */
export function isPricingV2Enabled(env: Record<string, string | undefined> = process.env): boolean {
  const raw = env.PRICING_V2_ENABLED;
  if (raw === undefined || raw === "") return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on";
}

/**
 * Režim „len plány“ (predvolene ZAPNUTÝ, fail-closed): predávajú sa štyri plány, mesačné balíky kreditov
 * a jednorazový kredit nie. Dôvod: `CREDITS_ENFORCEMENT` je vypnutý a náklad na kredit nie je meraný.
 * Vypína sa len výslovne `PRICING_V2_PLANS_ONLY=false` / `0` / `off`.
 */
export function isPricingV2PlansOnly(env: Record<string, string | undefined> = process.env): boolean {
  const raw = env.PRICING_V2_PLANS_ONLY?.trim().toLowerCase();
  return !(raw === "false" || raw === "0" || raw === "off");
}

export type PricingModel = "legacy" | "v2";

/**
 * Ktorý model platí pre kanceláriu. Kancelária s existujúcim (legacy) predplatným sa NIKDY
 * automaticky nepresúva, ani keď je v2 zapnuté — dohodnuté práva a obdobie ostávajú.
 * Fail-closed aj za behu (JSON, DB): v2 len pri presne `hasLegacySubscription === false`
 * a `v2Enabled === true`; chýbajúca alebo nečitateľná hodnota znamená legacy.
 */
export function resolvePricingModel(input: { v2Enabled: boolean; hasLegacySubscription: boolean }): PricingModel {
  if (input.hasLegacySubscription !== false) return "legacy";
  return input.v2Enabled === true ? "v2" : "legacy";
}

export type PricingV2Catalog = {
  vatPercent: number;
  creditUnit: PricingV2Amount;
  bands: Array<
    PricingV2Amount & {
      id: PricingV2BandId;
      label: string;
      minUsers: number;
      maxUsers: number | null;
      isFromPrice: boolean;
      monthlyCredits: number;
      /** ročná cena (12 × mesačná, bez zľavy): čistá, DPH aj konečná v centoch */
      annual: PricingV2Amount;
    }
  >;
  packs: Array<PricingV2Amount & { credits: number; netCentsPerCredit: number }>;
};

/** API kontrakt pre checkout-config a obrazovky: čistá aj konečná cena, bez ďalšieho prepočtu u volajúceho. */
export function buildPricingV2Catalog(vatPercent: number = PRICING_V2_VAT_PERCENT_DEFAULT): PricingV2Catalog {
  assertVatPercent(vatPercent);
  return {
    vatPercent,
    creditUnit: priceFromNetCents(PRICING_V2_CREDIT_NET_CENTS, vatPercent),
    bands: PRICING_V2_BANDS.map((b) => ({
      id: b.id,
      label: b.label,
      minUsers: b.minUsers,
      maxUsers: b.maxUsers,
      isFromPrice: b.isFromPrice,
      monthlyCredits: b.monthlyCredits,
      annual: priceFromNetCents(annualNetCents(b.netCents), vatPercent),
      ...priceFromNetCents(b.netCents, vatPercent),
    })),
    packs: PRICING_V2_MONTHLY_PACKS.map((p) => ({
      credits: p.credits,
      netCentsPerCredit: p.netCents / p.credits,
      ...priceFromNetCents(p.netCents, vatPercent),
    })),
  };
}
