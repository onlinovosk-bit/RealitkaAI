import { beforeEach, describe, expect, it, vi } from "vitest";

const V2_ENV: Record<string, string> = {
  STRIPE_PRICE_V2_START: "price_1Abcdefgh12341",
  STRIPE_PRICE_V2_TEAM: "price_1Abcdefgh12342",
  STRIPE_PRICE_V2_OFFICE: "price_1Abcdefgh12343",
  STRIPE_PRICE_V2_NETWORK: "price_1Abcdefgh12344",
  STRIPE_PRICE_V2_PACK_60: "price_1Abcdefgh12345",
  STRIPE_PRICE_V2_PACK_120: "price_1Abcdefgh12346",
  STRIPE_PRICE_V2_PACK_180: "price_1Abcdefgh12347",
  STRIPE_PRICE_V2_PACK_240: "price_1Abcdefgh12348",
  STRIPE_PRICE_V2_PACK_300: "price_1Abcdefgh12349",
  STRIPE_PRICE_V2_CREDIT: "price_1Abcdefgh12350",
};

async function get() {
  const { GET } = await import("@/app/api/billing/checkout-config/route");
  return (await GET()).json() as Promise<Record<string, unknown>>;
}

beforeEach(() => {
  vi.unstubAllEnvs();
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

  it("flag on, prices missing: checkoutAvailable false and only NAMES are listed", async () => {
    vi.stubEnv("PRICING_V2_ENABLED", "1");
    vi.stubEnv("STRIPE_PRICE_V2_START", V2_ENV.STRIPE_PRICE_V2_START);
    const v2 = (await get()).pricingV2 as {
      enabled: boolean;
      checkoutAvailable: boolean;
      missingPriceEnvKeys: string[];
      catalog: { bands: unknown[] };
    };
    expect(v2.enabled).toBe(true);
    expect(v2.checkoutAvailable).toBe(false);
    expect(v2.missingPriceEnvKeys).toContain("STRIPE_PRICE_V2_TEAM");
    expect(v2.missingPriceEnvKeys).not.toContain("STRIPE_PRICE_V2_START");
    expect(v2.missingPriceEnvKeys.every((n) => /^STRIPE_PRICE_V2_[A-Z0-9_]+$/.test(n))).toBe(true);
    expect(v2.catalog.bands).toHaveLength(4);
    expect(JSON.stringify(v2)).not.toContain("price_1Abcdefgh");
  });

  it("flag on, all prices valid: checkoutAvailable true with the catalog (net and gross)", async () => {
    vi.stubEnv("PRICING_V2_ENABLED", "on");
    for (const [k, v] of Object.entries(V2_ENV)) vi.stubEnv(k, v);
    const v2 = (await get()).pricingV2 as {
      checkoutAvailable: boolean;
      missingPriceEnvKeys: string[];
      catalog: { vatPercent: number; bands: Array<{ id: string; netCents: number; grossCents: number }> };
    };
    expect(v2.checkoutAvailable).toBe(true);
    expect(v2.missingPriceEnvKeys).toEqual([]);
    expect(v2.catalog.vatPercent).toBe(23);
    expect(v2.catalog.bands.find((b) => b.id === "team")).toMatchObject({ netCents: 6000, grossCents: 7380 });
  });

  it("len plány (predvolené): v odpovedi nie sú balíky; stačí 4 ceny plánov; JSON nenesie ceny balíkov", async () => {
    vi.stubEnv("PRICING_V2_ENABLED", "on");
    for (const [k, v] of Object.entries(V2_ENV).filter(([k]) => !k.includes("PACK") && !k.endsWith("CREDIT"))) vi.stubEnv(k, v);
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

  it("PRICING_V2_PLANS_ONLY=false: balíky v katalógu a vyžaduje sa všetkých 10 cien", async () => {
    vi.stubEnv("PRICING_V2_ENABLED", "on");
    vi.stubEnv("PRICING_V2_PLANS_ONLY", "false");
    for (const [k, v] of Object.entries(V2_ENV).filter(([k]) => !k.includes("PACK") && !k.endsWith("CREDIT"))) vi.stubEnv(k, v);
    const v2 = (await get()).pricingV2 as { plansOnly: boolean; checkoutAvailable: boolean; catalog: { packs: unknown[] } };
    expect(v2.plansOnly).toBe(false);
    expect(v2.checkoutAvailable).toBe(false);
    expect(v2.catalog.packs).toHaveLength(5);
  });
});
