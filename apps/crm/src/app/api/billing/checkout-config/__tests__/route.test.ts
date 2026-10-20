import { beforeEach, describe, expect, it, vi } from "vitest";

const V3_ENV: Record<string, string> = {
  STRIPE_PRICE_V3_SEAT_MONTHLY: "price_1Abcdefgh12341",
  STRIPE_PRICE_V3_SEAT_YEARLY: "price_1Abcdefgh12342",
  STRIPE_PRICE_V3_PACK_50: "price_1Abcdefgh12345",
  STRIPE_PRICE_V3_PACK_100: "price_1Abcdefgh12346",
  STRIPE_PRICE_V3_PACK_150: "price_1Abcdefgh12347",
  STRIPE_PRICE_V3_PACK_200: "price_1Abcdefgh12348",
  STRIPE_PRICE_V3_PACK_250: "price_1Abcdefgh12349",
  STRIPE_PRICE_V3_PACK_300: "price_1Abcdefgh12351",
  STRIPE_PRICE_V3_CREDIT: "price_1Abcdefgh12350",
};
const PLANS_ONLY_ENV = Object.entries(V3_ENV).filter(([k]) => !k.includes("PACK") && !k.endsWith("CREDIT"));
const COUPON_ENV = "promo_synthetic_9of12";

async function get() {
  const { GET } = await import("@/app/api/billing/checkout-config/route");
  return (await GET()).json() as Promise<Record<string, unknown>>;
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("GET /api/billing/checkout-config", () => {
  it("flag off: every legacy field is present and pricingV2 is a bare disabled stub (kritérium 1)", async () => {
    const body = await get();
    expect(Object.keys(body).sort()).toEqual(
      [
        "ok",
        "seatCheckoutAvailable",
        "topupCheckoutAvailable",
        "checkoutAvailable",
        "webhookSecretConfigured",
        "missingPriceEnvKeys",
        "founderCockpitEligible",
        "founderCockpitRemaining",
        "seatTiers",
        "cockpit",
        "topupPackages",
        "pricingV2",
      ].sort(),
    );
    expect(body.pricingV2).toEqual({ enabled: false, checkoutAvailable: false, missingPriceEnvKeys: [], catalog: null });
  });

  it("flag does not change any legacy field (only pricingV2 differs)", async () => {
    const off = await get();
    vi.stubEnv("PRICING_V2_ENABLED", "true");
    const on = await get();
    const { pricingV2: offV2, ...offRest } = off;
    const { pricingV2: onV2, ...onRest } = on;
    expect(onRest).toEqual(offRest);
    expect(offV2).not.toEqual(onV2);
  });

  it("flag off: katalóg ani názvy env sa nevracajú ani keď sú ceny nastavené (PRICING_PUBLIC_ENABLED to nemení)", async () => {
    for (const [k, v] of Object.entries(V3_ENV)) vi.stubEnv(k, v);
    vi.stubEnv("PRICING_PUBLIC_ENABLED", "true");
    const json = JSON.stringify((await get()).pricingV2);
    expect(JSON.parse(json)).toEqual({ enabled: false, checkoutAvailable: false, missingPriceEnvKeys: [], catalog: null });
    expect(json).not.toContain("price_1Abcdefgh");
  });

  it("flag on, prices missing: checkoutAvailable false and only NAMES are listed", async () => {
    vi.stubEnv("PRICING_V2_ENABLED", "1");
    vi.stubEnv("STRIPE_PRICE_V3_SEAT_MONTHLY", V3_ENV.STRIPE_PRICE_V3_SEAT_MONTHLY);
    vi.stubEnv("PRICING_V2_PLANS_ONLY", "false");
    const v2 = (await get()).pricingV2 as {
      enabled: boolean;
      checkoutAvailable: boolean;
      missingPriceEnvKeys: string[];
      catalog: { bands: unknown[] };
    };
    expect(v2.enabled).toBe(true);
    expect(v2.checkoutAvailable).toBe(false);
    expect(v2.missingPriceEnvKeys).toContain("STRIPE_PRICE_V3_PACK_50");
    expect(v2.missingPriceEnvKeys).not.toContain("STRIPE_PRICE_V3_SEAT_MONTHLY");
    expect(v2.missingPriceEnvKeys.every((n) => /^STRIPE_PRICE_V3_[A-Z0-9_]+$/.test(n))).toBe(true);
    expect(v2.catalog.bands).toHaveLength(4);
    expect(JSON.stringify(v2)).not.toContain("price_1Abcdefgh");
  });

  it("flag on, mesačná licencia chýba: checkout fail-closed (checkoutAvailable false), názov v zozname", async () => {
    vi.stubEnv("PRICING_V2_ENABLED", "on");
    const v2 = (await get()).pricingV2 as { checkoutAvailable: boolean; missingPriceEnvKeys: string[]; yearlyAvailable: boolean };
    expect(v2.checkoutAvailable).toBe(false);
    expect(v2.missingPriceEnvKeys).toEqual(["STRIPE_PRICE_V3_SEAT_MONTHLY"]);
    expect(v2.yearlyAvailable).toBe(false);
  });

  it("flag on, all prices valid: checkoutAvailable true with the catalog (net and gross, tiers)", async () => {
    vi.stubEnv("PRICING_V2_ENABLED", "on");
    vi.stubEnv("PRICING_V2_PLANS_ONLY", "false");
    for (const [k, v] of Object.entries(V3_ENV)) vi.stubEnv(k, v);
    const v2 = (await get()).pricingV2 as {
      checkoutAvailable: boolean;
      missingPriceEnvKeys: string[];
      catalog: {
        version: string;
        vatPercent: number;
        tiers: { year: unknown[]; month: unknown[] };
        bands: Array<{ id: string; netCents: number; grossCents: number }>;
        packs: Array<{ credits: number }>;
      };
    };
    expect(v2.checkoutAvailable).toBe(true);
    expect(v2.missingPriceEnvKeys).toEqual([]);
    expect(v2.catalog.version).toBe("v3");
    expect(v2.catalog.vatPercent).toBe(23);
    expect(v2.catalog.bands.find((b) => b.id === "team")).toMatchObject({ netCents: 6500, grossCents: 7995 });
    expect(v2.catalog.tiers.year).toHaveLength(5);
    expect(v2.catalog.tiers.month).toHaveLength(5);
    expect(v2.catalog.packs.map((p) => p.credits)).toEqual([50, 100, 150, 200, 250, 300]);
  });

  it("len plány (predvolené): v odpovedi nie sú balíky; stačí mesačná licencia; JSON nenesie ceny balíkov", async () => {
    vi.stubEnv("PRICING_V2_ENABLED", "on");
    for (const [k, v] of PLANS_ONLY_ENV) vi.stubEnv(k, v);
    const v2 = (await get()).pricingV2 as {
      plansOnly: boolean;
      checkoutAvailable: boolean;
      missingPriceEnvKeys: string[];
      catalog: { bands: unknown[]; packs: unknown[] };
    };
    expect(v2.plansOnly).toBe(true);
    expect(v2.checkoutAvailable).toBe(true);
    expect(v2.missingPriceEnvKeys).toEqual([]);
    expect(v2.catalog.bands).toHaveLength(4);
    expect(v2.catalog.packs).toEqual([]);
  });

  it("PRICING_V2_PLANS_ONLY=false: balíky v katalógu a vyžaduje sa mesačná licencia, 6 balíkov a kredit", async () => {
    vi.stubEnv("PRICING_V2_ENABLED", "on");
    vi.stubEnv("PRICING_V2_PLANS_ONLY", "false");
    for (const [k, v] of PLANS_ONLY_ENV) vi.stubEnv(k, v);
    const v2 = (await get()).pricingV2 as {
      plansOnly: boolean;
      checkoutAvailable: boolean;
      missingPriceEnvKeys: string[];
      catalog: { packs: unknown[] };
    };
    expect(v2.plansOnly).toBe(false);
    expect(v2.checkoutAvailable).toBe(false);
    expect(v2.missingPriceEnvKeys).toHaveLength(7);
    expect(v2.catalog.packs).toHaveLength(6);
  });

  it("ročné platenie: yearlyAvailable je true až keď existuje ročná licencia a (počas akcie) kupón; katalóg nesie ročnú cenu", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-19T08:00:00Z"));
    vi.stubEnv("PRICING_V2_ENABLED", "on");
    vi.stubEnv("STRIPE_PRICE_V3_SEAT_MONTHLY", V3_ENV.STRIPE_PRICE_V3_SEAT_MONTHLY);
    const none = (await get()).pricingV2 as { yearlyAvailable: boolean; checkoutAvailable: boolean };
    expect(none.yearlyAvailable).toBe(false);
    expect(none.checkoutAvailable).toBe(true); // mesačný predaj nie je dotknutý

    vi.stubEnv("STRIPE_PRICE_V3_SEAT_YEARLY", V3_ENV.STRIPE_PRICE_V3_SEAT_YEARLY);
    // ročná cena je, ale kupón 9/12 chýba -> ročné sa neponúka (zákazník by zaplatil 12 z 12)
    expect(((await get()).pricingV2 as { yearlyAvailable: boolean }).yearlyAvailable).toBe(false);

    vi.stubEnv("STRIPE_COUPON_V3_ANNUAL_PROMO", COUPON_ENV);
    const all = (await get()).pricingV2 as {
      yearlyAvailable: boolean;
      catalog: { promo: { active: boolean }; bands: Array<{ id: string; annual: { netCents: number; grossCents: number } }> };
    };
    expect(all.yearlyAvailable).toBe(true);
    expect(all.catalog.promo.active).toBe(true);
    expect(all.catalog.bands.find((b) => b.id === "start")?.annual).toMatchObject({ netCents: 30000, grossCents: 36900 });
    expect(JSON.stringify(all)).not.toContain("price_1Abcdefgh");
    expect(JSON.stringify(all)).not.toContain(COUPON_ENV);
  });

  it("po skončení akcie kupón nie je potrebný: ročné platenie je dostupné len s ročnou cenou", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2027-01-02T08:00:00Z"));
    vi.stubEnv("PRICING_V2_ENABLED", "on");
    vi.stubEnv("STRIPE_PRICE_V3_SEAT_MONTHLY", V3_ENV.STRIPE_PRICE_V3_SEAT_MONTHLY);
    vi.stubEnv("STRIPE_PRICE_V3_SEAT_YEARLY", V3_ENV.STRIPE_PRICE_V3_SEAT_YEARLY);
    const v2 = (await get()).pricingV2 as { yearlyAvailable: boolean; catalog: { promo: { active: boolean } } };
    expect(v2.yearlyAvailable).toBe(true);
    expect(v2.catalog.promo.active).toBe(false);
  });
});
