/**
 * Revolis licencia v3 — jeden Stripe produkt „Revolis licencia", cena podľa počtu maklérov
 * (Tiered / Graduated, Quantity = počet maklérov, daň Exclusive), mesačná a ročná cena.
 *
 * Stav: SSOT pre cenník a overenie súm. NIE JE zapojené do checkoutu — checkout dnes číta
 * `program-tier-pricing.ts` (STRIPE_PRICE_*). Zapojenie = samostatné GO.
 * Zdroj hodnôt: tabuľka pásiem schválená founderom (Stripe TEST režim overený 1/2/5/20/30/50/100 maklérov).
 * @see apps/crm/docs/pricing-v1.md (sekcia Licencia v3)
 */

export const LICENCE_V3_PRODUCT_NAME = "Revolis licencia";

export const LICENCE_V3_INTERVALS = ["month", "year"] as const;
export type LicenceV3Interval = (typeof LICENCE_V3_INTERVALS)[number];

/** Kľúče, podľa ktorých ceny v Stripe nájde aplikácia (Lookup key). */
export const LICENCE_V3_LOOKUP_KEYS: Record<LicenceV3Interval, string> = {
  month: "revolis_v3_licence_month",
  year: "revolis_v3_licence_year",
};

/**
 * Jedno pásmo Stripe Graduated ceny. Sumy v centoch.
 * `flatCents` sa účtuje raz, keď množstvo vstúpi do pásma; `unitCents` za každý kus v pásme.
 */
export type LicenceV3Tier = {
  /** Horná hranica pásma (vrátane); `null` = bez hornej hranice (Stripe „inf"). */
  upTo: number | null;
  unitCents: number;
  flatCents: number;
};

export const LICENCE_V3_TIERS: Record<LicenceV3Interval, readonly LicenceV3Tier[]> = {
  month: [
    { upTo: 1, unitCents: 0, flatCents: 3000 },
    { upTo: 2, unitCents: 0, flatCents: 3000 },
    { upTo: 5, unitCents: 0, flatCents: 1800 },
    { upTo: 10, unitCents: 1080, flatCents: 0 },
    { upTo: 20, unitCents: 720, flatCents: 0 },
    { upTo: 30, unitCents: 460, flatCents: 0 },
    { upTo: 50, unitCents: 480, flatCents: 0 },
    { upTo: null, unitCents: 360, flatCents: 0 },
  ],
  year: [
    { upTo: 1, unitCents: 0, flatCents: 30000 },
    { upTo: 2, unitCents: 0, flatCents: 30000 },
    { upTo: 5, unitCents: 0, flatCents: 18000 },
    { upTo: 10, unitCents: 10800, flatCents: 0 },
    { upTo: 20, unitCents: 7200, flatCents: 0 },
    { upTo: 30, unitCents: 5333, flatCents: 3 },
    { upTo: 50, unitCents: 4800, flatCents: 0 },
    { upTo: null, unitCents: 3600, flatCents: 0 },
  ],
};

/** Kupón: 25 %, Duration „Once", len produkt „Revolis licencia". */
export const LICENCE_V3_COUPON = {
  percentOff: 25,
  duration: "once",
  redeemBy: "2026-12-31",
} as const;

export function isLicenceV3Quantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1;
}

/**
 * Suma za `quantity` maklérov v centoch BEZ DPH (graduated: každé pásmo sa účtuje zvlášť).
 * Neplatné množstvo (< 1, nie celé číslo) hádže — nikdy tichý 0 €.
 */
export function licenceV3ChargeCents(interval: LicenceV3Interval, quantity: number): number {
  if (!isLicenceV3Quantity(quantity)) {
    throw new RangeError(`licence quantity must be an integer >= 1, got ${quantity}`);
  }
  let total = 0;
  let lower = 0;
  for (const tier of LICENCE_V3_TIERS[interval]) {
    if (quantity <= lower) break;
    const upper = tier.upTo ?? Infinity;
    const unitsInTier = Math.min(quantity, upper) - lower;
    total += tier.flatCents + unitsInTier * tier.unitCents;
    lower = upper;
  }
  return total;
}

/** Zľava kupónu (percento, Stripe zaokrúhľuje na celé centy). */
export function licenceV3AfterCouponCents(totalCents: number): number {
  return Math.round((totalCents * (100 - LICENCE_V3_COUPON.percentOff)) / 100);
}
