/**
 * Cenník v3 (GO foundera 2026-10-19) — licencia podľa počtu maklérov.
 * Modul sa volá ďalej `pricing-v2` (marker `pricing_model='v2'` = „paušál na kanceláriu“ ostáva, netreba migráciu).
 *
 * Všetky sumy sú v CENTOCH a BEZ DPH. Konečná cena sa počíta zo základu a sadzby DPH;
 * základ sa pri zmene sadzby nemení. Grant kreditov patrí kancelárii, nie používateľovi.
 *
 * Pri 1–20 makléroch je základ = mesačná cena pri ROČNEJ fakturácii (vrátane GO B, #908: 2 makléri 50 €, 3–5 maklérov 65 €).
 * Mesačná platba bez záväzku = základ × 1,2; ročná platba = 12 × základ.
 * Od 21. makléra (variant A+, GO Andreja 2026-10-21) sú mesačná aj ročná suma priamo graduated tarify
 * v `PRICING_V3_SEAT_TIERS` — ročná už nie je 10× mesačná a nie je deliteľná 12.
 * Akcia do 31. 12. 2026: kupón −25 % z ročnej sumy, `duration=once` (pri 1–20 vyjde presne 9 z 12 mesiacov).
 * Pásmo sa nevyberá ručne, odvodí sa z počtu maklérov (`resolvePricingV2Band`).
 *
 * `isPricingV2Enabled()` je predvolene vypnuté. Staré seat ceny v `program-tier-pricing.ts` ostávajú nedotknuté.
 */

/** Verzia cenníka. GO foundera: 2026-10-19. */
export const PRICING_VERSION = "v3";

/** Akcia 9/12 pri ročnej platbe platí najneskôr do tohto okamihu (= 31. 12. 2026 23:59:59 Europe/Bratislava). */
export const PRICING_V3_PROMO_UNTIL = "2026-12-31T22:59:59Z";

export const PRICING_V2_VAT_PERCENT_DEFAULT = 23;

export const PRICING_V2_BAND_IDS = ["start", "team", "office", "network"] as const;
export type PricingV2BandId = (typeof PRICING_V2_BAND_IDS)[number];

export type PricingV2Band = {
  id: PricingV2BandId;
  label: string;
  minUsers: number;
  /** null = bez hornej hranice */
  maxUsers: number | null;
  /** základ (mesačne pri ročnej fakturácii) pri `minUsers`, v centoch bez DPH */
  netCents: number;
  /** true = „od“ cena (cena v pásme rastie s počtom maklérov) */
  isFromPrice: boolean;
  /** mesačný grant kreditov pre celú kanceláriu */
  monthlyCredits: number;
};

/** Zmrazí zoznam aj jeho položky, aby cenník nešlo za behu potichu prepísať. */
function freezeList<T extends object>(items: T[]): readonly T[] {
  return Object.freeze(items.map((item) => Object.freeze({ ...item })));
}

/**
 * Pásma v3 (1 / 2–5 / 6–10 / 11+). `netCents` = základ pri `minUsers`: Team od 50 € (2 makléri), 3–5 maklérov 65 € (strop). Mesačný grant kreditov kancelárie ostáva 25 / 60 / 120 / 175
 * (v3 ho nemení; otvorená otázka pre foundera).
 */
export const PRICING_V2_BANDS: readonly PricingV2Band[] = freezeList<PricingV2Band>([
  { id: "start", label: "Start", minUsers: 1, maxUsers: 1, netCents: 2500, isFromPrice: false, monthlyCredits: 25 },
  { id: "team", label: "Team", minUsers: 2, maxUsers: 5, netCents: 5000, isFromPrice: true, monthlyCredits: 60 },
  { id: "office", label: "Kancelária", minUsers: 6, maxUsers: 10, netCents: 7400, isFromPrice: true, monthlyCredits: 120 },
  { id: "network", label: "Sieť", minUsers: 11, maxUsers: null, netCents: 11600, isFromPrice: true, monthlyCredits: 175 },
]);

/** Fakturačné obdobie plánu. Ročné platenie je len plán (balíky kreditov sú mesačné a s ročným plánom sa nemiešajú). */
export const PRICING_V2_INTERVALS = ["month", "year"] as const;
export type PricingV2Interval = (typeof PRICING_V2_INTERVALS)[number];

/** Ročná platba = 12 × základ (bežná cena). Kredity sa pri ročnom pláne prideľujú naďalej MESAČNE. */
export const PRICING_V2_ANNUAL_MONTHS = 12;

/** Akcia do `PRICING_V3_PROMO_UNTIL`: prvý ročný rok sa platí 9 z 12 mesiacov. */
export const PRICING_V3_PROMO_PAID_MONTHS = 9;

/** Mesačná platba bez ročného záväzku = základ × 1,2 (presne v centoch). */
export const PRICING_V3_MONTHLY_MARKUP_PERCENT = 20;

export function isPricingV2Interval(value: unknown): value is PricingV2Interval {
  return value === "month" || value === "year";
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

function assertUsers(n: number): void {
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 1) {
    throw new RangeError(`Neplatný počet maklérov: ${String(n)}`);
  }
}

export function annualNetCents(monthlyNetCents: number): number {
  assertNetCents(monthlyNetCents);
  const annual = monthlyNetCents * PRICING_V2_ANNUAL_MONTHS;
  if (!Number.isSafeInteger(annual)) throw new RangeError(`Ročný základ ceny nie je bezpečné celé číslo: ${annual}`);
  return annual;
}

/**
 * Základ: mesačná cena pri ročnej fakturácii pre `n` maklérov (v centoch bez DPH).
 * 1 = 25 €, 2 = 50 €, 3–5 = 65 € (strop Team), potom 9 / 6 € za makléra do 20.
 * Od 21. nie je ročná suma deliteľná 12 — fakturovaná cena je `licenseNetCents`.
 */
export function licenseBaseMonthlyNetCents(n: number): number {
  assertUsers(n);
  if (n > 20) {
    throw new RangeError(
      `Základ (mesačne pri ročnej fakturácii) je celé číslo len pre 1–20 maklérov; od 21. platí graduated tarifa (licenseNetCents).`,
    );
  }
  let base: number;
  if (n === 1) base = 2500;
  else if (n === 2) base = 5000; // 2 × 25 €: bez skoku na hranici 1→2
  else if (n <= 5) base = 6500; // strop Team
  else if (n <= 10) base = 6500 + 900 * (n - 5);
  else base = 11000 + 600 * (n - 10);
  if (!Number.isSafeInteger(base)) throw new RangeError(`Základ ceny nie je bezpečné celé číslo: ${base}`);
  return base;
}

/** Cena licencie za jedno fakturačné obdobie. Pri 1–20 = základ × 1,2 / × 12; od 21. priamo graduated tarifa. */
export function licenseNetCents(n: number, interval: PricingV2Interval): number {
  if (!isPricingV2Interval(interval)) throw new RangeError(`Neplatné fakturačné obdobie: ${String(interval)}`);
  const total = graduatedTierNetCents(PRICING_V3_SEAT_TIERS[interval], n);
  if (!Number.isSafeInteger(total)) throw new RangeError(`Cena licencie nie je bezpečné celé číslo: ${total}`);
  return total;
}

/**
 * Orientačný mesačný prepočet bežnej ročnej ceny. Pri 1–20 je presný základ.
 * Od 21. je to `Math.round(ročná / 12)` a NIE JE fakturovaná položka.
 */
export function illustrativeAnnualMonthlyNetCents(n: number): number {
  const year = licenseNetCents(n, "year");
  if (year % PRICING_V2_ANNUAL_MONTHS === 0) return year / PRICING_V2_ANNUAL_MONTHS;
  return Math.round(year / PRICING_V2_ANNUAL_MONTHS);
}

/**
 * Prvá ročná faktúra v akcii = ročná suma po kupóne −25 % (zaokrúhlené na najbližší cent, ako Stripe).
 * Pri 1–20 vyjde presne 9 × základ.
 */
export function annualPromoNetCents(n: number): number {
  const year = licenseNetCents(n, "year");
  const discount = Math.round((year * 25) / 100);
  const promo = year - discount;
  if (!Number.isSafeInteger(promo) || promo < 0) throw new RangeError(`Akciová ročná cena nie je platná: ${promo}`);
  return promo;
}

/** Akcia platí do termínu vrátane (`now <= PRICING_V3_PROMO_UNTIL`). */
export function isAnnualPromoActive(now: Date = new Date()): boolean {
  const t = now.getTime();
  return Number.isFinite(t) && t <= Date.parse(PRICING_V3_PROMO_UNTIL);
}

export type PricingV3Tier = {
  /** horná hranica množstva (vrátane); null = bez hornej hranice (Stripe `inf`) */
  up_to: number | null;
  /** jednorazovo pripočítané, keď množstvo zasiahne tento tier */
  flat_amount: number;
  /** cena za kus v tomto tieri */
  unit_amount: number;
};

/**
 * Stripe `billing_scheme=tiered`, `tiers_mode=graduated`, quantity = počet maklérov.
 * Zdroj pravdy pre `scripts/ops/stripe-expected-prices.json` (drift test).
 */
export const PRICING_V3_SEAT_TIERS: {
  readonly year: readonly PricingV3Tier[];
  readonly month: readonly PricingV3Tier[];
} = Object.freeze({
  year: Object.freeze([
    Object.freeze({ up_to: 1, flat_amount: 30000, unit_amount: 0 }),
    Object.freeze({ up_to: 2, flat_amount: 30000, unit_amount: 0 }),
    Object.freeze({ up_to: 5, flat_amount: 18000, unit_amount: 0 }),
    Object.freeze({ up_to: 10, flat_amount: 0, unit_amount: 10800 }),
    Object.freeze({ up_to: 20, flat_amount: 0, unit_amount: 7200 }),
    Object.freeze({ up_to: 30, flat_amount: 3, unit_amount: 5333 }),
    Object.freeze({ up_to: 50, flat_amount: 0, unit_amount: 4800 }),
    Object.freeze({ up_to: null, flat_amount: 0, unit_amount: 3600 }),
  ]),
  month: Object.freeze([
    Object.freeze({ up_to: 1, flat_amount: 3000, unit_amount: 0 }),
    Object.freeze({ up_to: 2, flat_amount: 3000, unit_amount: 0 }),
    Object.freeze({ up_to: 5, flat_amount: 1800, unit_amount: 0 }),
    Object.freeze({ up_to: 10, flat_amount: 0, unit_amount: 1080 }),
    Object.freeze({ up_to: 20, flat_amount: 0, unit_amount: 720 }),
    Object.freeze({ up_to: 30, flat_amount: 0, unit_amount: 460 }),
    Object.freeze({ up_to: 50, flat_amount: 0, unit_amount: 480 }),
    Object.freeze({ up_to: null, flat_amount: 0, unit_amount: 360 }),
  ]),
});

/** Simulácia Stripe graduated pricing: flat sa pripočíta raz, keď množstvo zasiahne tier; unit × počet kusov v tieri. */
export function graduatedTierNetCents(tiers: readonly PricingV3Tier[], quantity: number): number {
  assertUsers(quantity);
  let total = 0;
  let prevUpTo = 0;
  for (const tier of tiers) {
    const top = tier.up_to === null ? Number.POSITIVE_INFINITY : tier.up_to;
    const inTier = Math.min(quantity, top) - prevUpTo;
    if (inTier > 0) total += tier.flat_amount + tier.unit_amount * inTier;
    if (quantity <= top) break;
    prevUpTo = top;
  }
  return total;
}

/** Samostatne dokúpený kredit (bez balíka), bez DPH (0,75 €). */
export const PRICING_V2_CREDIT_NET_CENTS = 75;

export type PricingV2Pack = {
  /** kreditov mesačne (opakované predplatné navyše k plánu) */
  credits: number;
  /** mesačná cena v centoch bez DPH */
  netCents: number;
};

export const PRICING_V2_MONTHLY_PACKS: readonly PricingV2Pack[] = freezeList<PricingV2Pack>([
  { credits: 50, netCents: 2600 },
  { credits: 100, netCents: 5100 },
  { credits: 150, netCents: 7400 },
  { credits: 200, netCents: 9400 },
  { credits: 250, netCents: 11400 },
  { credits: 300, netCents: 13100 },
]);

export type PricingV2BandResult =
  | { ok: true; band: PricingV2Band }
  | { ok: false; reason: "invalid_user_count" };

/** Počet používateľov → pásmo s výsledkom (bez výnimky). Nulový, záporný, desatinný alebo nekonečný počet nevyberie nič. */
export function resolvePricingV2BandResult(users: number): PricingV2BandResult {
  if (typeof users !== "number" || !Number.isSafeInteger(users) || users < 1) {
    return { ok: false, reason: "invalid_user_count" };
  }
  const band = PRICING_V2_BANDS.find(
    (b) => users >= b.minUsers && (b.maxUsers === null || users <= b.maxUsers),
  );
  return band ? { ok: true, band } : { ok: false, reason: "invalid_user_count" };
}

/** Počet maklérov → id pásma (1 / 2–5 / 6–10 / 11+). Neplatný počet vyhodí `RangeError`. */
export function resolvePricingV2Band(n: number): PricingV2BandId {
  const r = resolvePricingV2BandResult(n);
  if (!r.ok) throw new RangeError(`Neplatný počet maklérov: ${String(n)}`);
  return r.band.id;
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
 * Režim „len plány“ (predvolene ZAPNUTÝ, fail-closed): predávajú sa len plány licencie, mesačné balíky kreditov
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

export type PricingV2LicenseQuote = {
  users: number;
  bandId: PricingV2BandId;
  /** pri 1–20 presný základ; od 21. len orientačný prepočet ročnej sumy / 12 (nie fakturovaná položka) */
  baseMonthly: PricingV2Amount;
  /** mesačná platba bez záväzku */
  monthly: PricingV2Amount;
  /** ročná platba, bežná cena */
  annual: PricingV2Amount;
  /** prvá ročná faktúra v akcii (ročná suma po kupóne −25 %) */
  annualPromoFirstYear: PricingV2Amount;
};

/** Cena licencie pre `n` maklérov vo všetkých variantoch (čistá, DPH, konečná). */
export function quotePricingV2License(
  n: number,
  vatPercent: number = PRICING_V2_VAT_PERCENT_DEFAULT,
): PricingV2LicenseQuote {
  assertVatPercent(vatPercent);
  return {
    users: n,
    bandId: resolvePricingV2Band(n),
    baseMonthly: priceFromNetCents(illustrativeAnnualMonthlyNetCents(n), vatPercent),
    monthly: priceFromNetCents(licenseNetCents(n, "month"), vatPercent),
    annual: priceFromNetCents(licenseNetCents(n, "year"), vatPercent),
    annualPromoFirstYear: priceFromNetCents(annualPromoNetCents(n), vatPercent),
  };
}

export type PricingV2Catalog = {
  version: typeof PRICING_VERSION;
  vatPercent: number;
  creditUnit: PricingV2Amount;
  promo: { until: string; active: boolean; paidMonths: number; totalMonths: number };
  /** Stripe tiery licencie (len čisté centy); základ pre drift test */
  tiers: { year: readonly PricingV3Tier[]; month: readonly PricingV3Tier[] };
  bands: Array<
    PricingV2Amount & {
      id: PricingV2BandId;
      label: string;
      minUsers: number;
      maxUsers: number | null;
      isFromPrice: boolean;
      monthlyCredits: number;
      /** ceny za makléra: základ pri začiatku pásma a príplatok za každého ďalšieho (základ, mesačne pri ročnej fakturácii) */
      seat: { fromUsersBaseMonthlyNetCents: number; extraSeatBaseMonthlyNetCents: number | null };
      /** ročná cena pri `minUsers` (12 × základ): čistá, DPH aj konečná v centoch */
      annual: PricingV2Amount;
      /** mesačná platba bez záväzku pri `minUsers` (základ × 1,2) */
      monthly: PricingV2Amount;
    }
  >;
  packs: Array<PricingV2Amount & { credits: number; netCentsPerCredit: number }>;
};

/** Príplatok za ďalšieho makléra (základ, mesačne) hneď nad začiatkom pásma; null = pásmo je paušál. */
function extraSeatBase(band: PricingV2Band): number | null {
  if (band.maxUsers === band.minUsers || band.id === "team") return null;
  return licenseBaseMonthlyNetCents(band.minUsers + 1) - licenseBaseMonthlyNetCents(band.minUsers);
}

/** API kontrakt pre checkout-config a obrazovky: čistá aj konečná cena, bez ďalšieho prepočtu u volajúceho. */
export function buildPricingV2Catalog(
  vatPercent: number = PRICING_V2_VAT_PERCENT_DEFAULT,
  now: Date = new Date(),
): PricingV2Catalog {
  assertVatPercent(vatPercent);
  return {
    version: PRICING_VERSION,
    vatPercent,
    creditUnit: priceFromNetCents(PRICING_V2_CREDIT_NET_CENTS, vatPercent),
    promo: {
      until: PRICING_V3_PROMO_UNTIL,
      active: isAnnualPromoActive(now),
      paidMonths: PRICING_V3_PROMO_PAID_MONTHS,
      totalMonths: PRICING_V2_ANNUAL_MONTHS,
    },
    tiers: { year: PRICING_V3_SEAT_TIERS.year, month: PRICING_V3_SEAT_TIERS.month },
    bands: PRICING_V2_BANDS.map((b) => ({
      id: b.id,
      label: b.label,
      minUsers: b.minUsers,
      maxUsers: b.maxUsers,
      isFromPrice: b.isFromPrice,
      monthlyCredits: b.monthlyCredits,
      seat: { fromUsersBaseMonthlyNetCents: b.netCents, extraSeatBaseMonthlyNetCents: extraSeatBase(b) },
      annual: priceFromNetCents(licenseNetCents(b.minUsers, "year"), vatPercent),
      monthly: priceFromNetCents(licenseNetCents(b.minUsers, "month"), vatPercent),
      ...priceFromNetCents(b.netCents, vatPercent),
    })),
    packs: PRICING_V2_MONTHLY_PACKS.map((p) => ({
      credits: p.credits,
      netCentsPerCredit: p.netCents / p.credits,
      ...priceFromNetCents(p.netCents, vatPercent),
    })),
  };
}
