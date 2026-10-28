import { describe, expect, it } from "vitest";
import {
  PRICING_V2_BAND_ACCOUNT_TIER,
  PRICING_V2_CREDIT_PRICE_ENV,
  PRICING_V2_PACK_PRICE_ENV,
  PRICING_V3_ANNUAL_PROMO_COUPON_ENV,
  PRICING_V3_PLAN_PRICE_ENV,
  PRICING_V3_SEAT_MONTHLY_PRICE_ENV,
  PRICING_V3_SEAT_PRICE_ENV,
  PRICING_V3_SEAT_YEARLY_PRICE_ENV,
  buildPricingV2PlanMetadata,
  isPricingPublicEnabled,
  missingPricingV2PriceEnvKeys,
  missingPricingV2YearlyPriceEnvKeys,
  parsePricingV2CheckoutRequest,
  readPricingV2CreditsMetadata,
  readPricingV2PlanMetadata,
  resolveAnnualPromoCouponId,
  resolvePricingV3PlanPriceId,
} from "@/lib/pricing-v2-contract";
import { PRICING_V2_MONTHLY_PACKS } from "@/lib/pricing-v2";

const FAKE_PRICE = "price_1Abcdefgh12345";

describe("pricing-v2-contract: požiadavka na checkout", () => {
  it("plán bez balíka a s balíkom", () => {
    expect(parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2", users: 4 })).toEqual({
      ok: true,
      value: { checkoutType: "pricing_v2", users: 4, packCredits: null, interval: "month" },
    });
    expect(parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2", users: 26, packCredits: 150 })).toEqual({
      ok: true,
      value: { checkoutType: "pricing_v2", users: 26, packCredits: 150, interval: "month" },
    });
    expect(parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2", users: 2, packCredits: 0 })).toEqual({
      ok: true,
      value: { checkoutType: "pricing_v2", users: 2, packCredits: null, interval: "month" },
    });
  });

  it("neplatný počet používateľov alebo balík sa odmietne", () => {
    for (const users of [0, -1, 1.5, Number.NaN, "3", null, undefined, 1e21]) {
      expect(parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2", users })).toEqual({
        ok: false,
        reason: "invalid_user_count",
      });
    }
    for (const packCredits of [60, 120, 180, 240, 77, -50, "50", Number.NaN, true]) {
      expect(parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2", users: 3, packCredits })).toEqual({
        ok: false,
        reason: "invalid_pack",
      });
    }
  });

  it("jednorazové kredity: len kladné celé číslo s presnou sumou", () => {
    expect(parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2_credits", credits: 25 })).toEqual({
      ok: true,
      value: { checkoutType: "pricing_v2_credits", credits: 25 },
    });
    for (const credits of [0, -3, 2.5, Number.NaN, "5", null, Number.MAX_SAFE_INTEGER]) {
      expect(parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2_credits", credits })).toEqual({
        ok: false,
        reason: "invalid_credits",
      });
    }
  });

  it("legacy telá a nesmysly nie sú v2 (patria starej vetve)", () => {
    for (const body of [{ checkoutType: "seat", seatTier: "team" }, { type: "topup" }, {}, null, undefined, "x", 5]) {
      expect(parsePricingV2CheckoutRequest(body)).toEqual({ ok: false, reason: "not_pricing_v2" });
    }
  });
});

describe("pricing-v2-contract: metadáta checkoutu", () => {
  const base = { agencyId: "a-1", authUserId: "u-1", profileId: "p-1" };

  it("round-trip: build → read dá pôvodné hodnoty", () => {
    const meta = buildPricingV2PlanMetadata({ ...base, users: 7, packCredits: 100 });
    expect(meta).toMatchObject({ checkoutType: "pricing_v2", bandId: "office", users: "7", packCredits: "100" });
    expect(readPricingV2PlanMetadata(meta)).toEqual({
      agencyId: "a-1",
      authUserId: "u-1",
      bandId: "office",
      users: 7,
      packCredits: 100,
      interval: "month",
    });
    const noPack = buildPricingV2PlanMetadata({ ...base, users: 1, packCredits: null });
    expect(noPack.packCredits).toBe("0");
    expect(readPricingV2PlanMetadata(noPack)?.packCredits).toBe(0);
  });

  it("build odmietne neplatný vstup a prázdne agencyId", () => {
    expect(() => buildPricingV2PlanMetadata({ ...base, users: 0, packCredits: null })).toThrow(RangeError);
    expect(() => buildPricingV2PlanMetadata({ ...base, agencyId: "  ", users: 3, packCredits: null })).toThrow(RangeError);
  });

  it("webhook odmietne sfalšované alebo poškodené metadáta (fail-closed)", () => {
    const ok = buildPricingV2PlanMetadata({ ...base, users: 3, packCredits: 50 });
    expect(readPricingV2PlanMetadata({ ...ok, bandId: "office" })).toBeNull(); // pásmo nesedí s počtom
    expect(readPricingV2PlanMetadata({ ...ok, users: "0" })).toBeNull();
    expect(readPricingV2PlanMetadata({ ...ok, users: "abc" })).toBeNull();
    expect(readPricingV2PlanMetadata({ ...ok, packCredits: "77" })).toBeNull();
    expect(readPricingV2PlanMetadata({ ...ok, packCredits: "60" })).toBeNull(); // stará veľkosť
    expect(readPricingV2PlanMetadata({ ...ok, bandId: "team", users: "6" })).toBeNull(); // 6 je už Kancelária
    expect(readPricingV2PlanMetadata({ ...ok, agencyId: "" })).toBeNull();
    expect(readPricingV2PlanMetadata({ ...ok, checkoutType: "seat" })).toBeNull();
    expect(readPricingV2PlanMetadata(null)).toBeNull();
    expect(readPricingV2PlanMetadata(undefined)).toBeNull();
  });

  it("metadáta jednorazových kreditov", () => {
    expect(
      readPricingV2CreditsMetadata({ checkoutType: "pricing_v2_credits", agencyId: "a-1", credits: "40" }),
    ).toEqual({ agencyId: "a-1", credits: 40 });
    for (const credits of ["0", "-1", "1.5", "x", ""]) {
      expect(readPricingV2CreditsMetadata({ checkoutType: "pricing_v2_credits", agencyId: "a-1", credits })).toBeNull();
    }
    expect(readPricingV2CreditsMetadata({ checkoutType: "pricing_v2_credits", agencyId: "", credits: "5" })).toBeNull();
    expect(readPricingV2CreditsMetadata({ checkoutType: "pricing_v2", agencyId: "a-1", credits: "5" })).toBeNull();
  });
});

describe("pricing-v2-contract: Stripe price kľúče a mapovanie", () => {
  it("env názvy v3 sú presne podľa zadania a navzájom unikátne", () => {
    expect(PRICING_V3_SEAT_MONTHLY_PRICE_ENV).toBe("STRIPE_PRICE_V3_SEAT_MONTHLY");
    expect(PRICING_V3_SEAT_YEARLY_PRICE_ENV).toBe("STRIPE_PRICE_V3_SEAT_YEARLY");
    expect(PRICING_V3_ANNUAL_PROMO_COUPON_ENV).toBe("STRIPE_COUPON_V3_ANNUAL_PROMO");
    expect(PRICING_V3_SEAT_PRICE_ENV).toEqual({ month: "STRIPE_PRICE_V3_SEAT_MONTHLY", year: "STRIPE_PRICE_V3_SEAT_YEARLY" });
    expect(PRICING_V3_PLAN_PRICE_ENV).toEqual({
      start: { month: "STRIPE_PRICE_V3_START_MONTHLY", year: "STRIPE_PRICE_V3_START_YEARLY" },
      team: { month: "STRIPE_PRICE_V3_TEAM_MONTHLY", year: "STRIPE_PRICE_V3_TEAM_YEARLY" },
      office: { month: "STRIPE_PRICE_V3_KANCELARIA_MONTHLY", year: "STRIPE_PRICE_V3_KANCELARIA_YEARLY" },
      network: { month: "STRIPE_PRICE_V3_SIET_MONTHLY", year: "STRIPE_PRICE_V3_SIET_YEARLY" },
    });
    expect(PRICING_V2_PACK_PRICE_ENV).toEqual({
      50: "STRIPE_PRICE_V3_PACK_50",
      100: "STRIPE_PRICE_V3_PACK_100",
      150: "STRIPE_PRICE_V3_PACK_150",
      200: "STRIPE_PRICE_V3_PACK_200",
      250: "STRIPE_PRICE_V3_PACK_250",
      300: "STRIPE_PRICE_V3_PACK_300",
    });
    expect(PRICING_V2_CREDIT_PRICE_ENV).toBe("STRIPE_PRICE_V3_CREDIT");
    const names = [
      ...Object.values(PRICING_V3_PLAN_PRICE_ENV).flatMap((v) => [v.month, v.year]),
      PRICING_V3_ANNUAL_PROMO_COUPON_ENV,
      ...PRICING_V2_MONTHLY_PACKS.map((p) => PRICING_V2_PACK_PRICE_ENV[p.credits]),
      PRICING_V2_CREDIT_PRICE_ENV,
    ];
    expect(new Set(names).size).toBe(names.length);
    expect(names).toHaveLength(8 + 1 + 6 + 1);
    expect(names.some((n) => n.startsWith("STRIPE_PRICE_V2_"))).toBe(false);
  });

  it("chýbajúce a placeholder ceny sa nahlásia názvom; platné nie", () => {
    const full = { PRICING_V2_PLANS_ONLY: "false" };
    const all = missingPricingV2PriceEnvKeys(full);
    expect(all).toEqual([
      "STRIPE_PRICE_V3_START_MONTHLY",
      "STRIPE_PRICE_V3_TEAM_MONTHLY",
      "STRIPE_PRICE_V3_KANCELARIA_MONTHLY",
      "STRIPE_PRICE_V3_SIET_MONTHLY",
      "STRIPE_PRICE_V3_PACK_50",
      "STRIPE_PRICE_V3_PACK_100",
      "STRIPE_PRICE_V3_PACK_150",
      "STRIPE_PRICE_V3_PACK_200",
      "STRIPE_PRICE_V3_PACK_250",
      "STRIPE_PRICE_V3_PACK_300",
      "STRIPE_PRICE_V3_CREDIT",
    ]);
    const env: Record<string, string> = { ...full };
    for (const n of all) env[n] = FAKE_PRICE;
    expect(missingPricingV2PriceEnvKeys(env)).toEqual([]);
    expect(missingPricingV2PriceEnvKeys({ ...env, STRIPE_PRICE_V3_TEAM_MONTHLY: "price_xxx" })).toEqual(["STRIPE_PRICE_V3_TEAM_MONTHLY"]);
    expect(missingPricingV2PriceEnvKeys({ ...env, STRIPE_PRICE_V3_PACK_50: "" })).toEqual(["STRIPE_PRICE_V3_PACK_50"]);
  });

  it("režim „len plány“ (predvolený): vyžaduje sa iba mesačná cena licencie, balíky a kredit nie", () => {
    expect(missingPricingV2PriceEnvKeys({})).toEqual([
      "STRIPE_PRICE_V3_START_MONTHLY",
      "STRIPE_PRICE_V3_TEAM_MONTHLY",
      "STRIPE_PRICE_V3_KANCELARIA_MONTHLY",
      "STRIPE_PRICE_V3_SIET_MONTHLY",
    ]);
    expect(missingPricingV2PriceEnvKeys({ STRIPE_PRICE_V3_SEAT_MONTHLY: FAKE_PRICE })).toEqual([]);
    expect(missingPricingV2PriceEnvKeys({
      STRIPE_PRICE_V3_START_MONTHLY: FAKE_PRICE,
      STRIPE_PRICE_V3_TEAM_MONTHLY: FAKE_PRICE,
      STRIPE_PRICE_V3_KANCELARIA_MONTHLY: FAKE_PRICE,
      STRIPE_PRICE_V3_SIET_MONTHLY: FAKE_PRICE,
    })).toEqual([]);
  });

  it("pásmo → account_tier zhodné s legacy seat tiermi", () => {
    expect(PRICING_V2_BAND_ACCOUNT_TIER).toEqual({
      start: "starter",
      team: "pro",
      office: "enterprise",
      network: "enterprise",
    });
  });
});

describe("pricing-v2-contract: ročné platenie", () => {
  it("interval year sa prijme pre plán bez balíka; neznámy interval a ročný plán s balíkom sa odmietnu", () => {
    expect(parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2", users: 3, interval: "year" })).toEqual({
      ok: true,
      value: { checkoutType: "pricing_v2", users: 3, packCredits: null, interval: "year" },
    });
    for (const interval of ["week", "YEAR", "", 12, true]) {
      expect(parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2", users: 3, interval })).toEqual({
        ok: false,
        reason: "invalid_interval",
      });
    }
    expect(parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2", users: 3, interval: "year", packCredits: 50 })).toEqual({
      ok: false,
      reason: "invalid_pack",
    });
  });

  it("metadáta ročného plánu: round-trip; chýbajúci interval = mesačný; neznámy a ročný s balíkom = null", () => {
    const base = { agencyId: "a-1", authUserId: "u-1", profileId: "p-1" };
    const meta = buildPricingV2PlanMetadata({ ...base, users: 7, packCredits: null, interval: "year" });
    expect(meta.interval).toBe("year");
    expect(readPricingV2PlanMetadata(meta)?.interval).toBe("year");
    const { interval: _omit, ...legacySession } = meta;
    expect(readPricingV2PlanMetadata(legacySession)?.interval).toBe("month");
    expect(readPricingV2PlanMetadata({ ...meta, interval: "quarter" })).toBeNull();
    expect(readPricingV2PlanMetadata({ ...meta, interval: "year", packCredits: "50" })).toBeNull();
  });

  it("ročná cena licencie: env kľúče po pásmach, hlásia sa samostatne od mesačných", () => {
    expect(missingPricingV2YearlyPriceEnvKeys({})).toEqual([
      "STRIPE_PRICE_V3_START_YEARLY",
      "STRIPE_PRICE_V3_TEAM_YEARLY",
      "STRIPE_PRICE_V3_KANCELARIA_YEARLY",
      "STRIPE_PRICE_V3_SIET_YEARLY",
    ]);
    expect(missingPricingV2YearlyPriceEnvKeys({ STRIPE_PRICE_V3_SEAT_YEARLY: FAKE_PRICE })).toEqual([]);
    expect(missingPricingV2YearlyPriceEnvKeys({
      STRIPE_PRICE_V3_START_YEARLY: FAKE_PRICE,
      STRIPE_PRICE_V3_TEAM_YEARLY: FAKE_PRICE,
      STRIPE_PRICE_V3_KANCELARIA_YEARLY: FAKE_PRICE,
      STRIPE_PRICE_V3_SIET_YEARLY: FAKE_PRICE,
    })).toEqual([]);
    // mesačný predaj nie je dotknutý chýbajúcou ročnou cenou
    expect(missingPricingV2PriceEnvKeys({})).not.toContain("STRIPE_PRICE_V3_TEAM_YEARLY");
  });

  it("nová env má prednosť, stará intervalová cena je iba fallback", () => {
    expect(resolvePricingV3PlanPriceId("team", "month", { STRIPE_PRICE_V3_SEAT_MONTHLY: FAKE_PRICE })).toEqual({
      ok: true,
      envName: "STRIPE_PRICE_V3_SEAT_MONTHLY",
      priceId: FAKE_PRICE,
      fallback: true,
    });
    expect(resolvePricingV3PlanPriceId("team", "month", { STRIPE_PRICE_V3_TEAM_MONTHLY: "price_xxx", STRIPE_PRICE_V3_SEAT_MONTHLY: FAKE_PRICE })).toEqual({
      ok: false,
      envName: "STRIPE_PRICE_V3_TEAM_MONTHLY",
    });
    expect(resolvePricingV3PlanPriceId("team", "month", { STRIPE_PRICE_V3_TEAM_MONTHLY: "price_1TeamMonthly123" })).toEqual({
      ok: true,
      envName: "STRIPE_PRICE_V3_TEAM_MONTHLY",
      priceId: "price_1TeamMonthly123",
      fallback: false,
    });
  });
});

describe("pricing-v2-contract: balíky kreditov (parser)", () => {
  it("prijme len 50/100/150/200/250/300", () => {
    for (const packCredits of [50, 100, 150, 200, 250, 300]) {
      const r = parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2", users: 3, packCredits });
      expect(r).toEqual({ ok: true, value: { checkoutType: "pricing_v2", users: 3, packCredits, interval: "month" } });
    }
  });

  it("odmietne staré veľkosti 60/120/180/240", () => {
    for (const packCredits of [60, 120, 180, 240]) {
      expect(parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2", users: 3, packCredits })).toEqual({
        ok: false,
        reason: "invalid_pack",
      });
    }
  });

  it("samostatný kredit: suma sa počíta po 0,75 € (presnosť na cent)", () => {
    expect(parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2_credits", credits: 100 }).ok).toBe(true);
    expect(parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2_credits", credits: Math.floor(Number.MAX_SAFE_INTEGER / 75) + 1 })).toEqual({
      ok: false,
      reason: "invalid_credits",
    });
  });
});

describe("pricing-v2-contract: pásmo z počtu maklérov (1 / 2–5 / 6–10 / 11+)", () => {
  const base = { agencyId: "a-1", authUserId: "u-1", profileId: "p-1" };
  it("metadáta nesú pásmo odvodené z počtu", () => {
    const expected: Array<[number, string]> = [[1, "start"], [2, "team"], [5, "team"], [6, "office"], [10, "office"], [11, "network"], [50, "network"]];
    for (const [users, bandId] of expected) {
      expect(buildPricingV2PlanMetadata({ ...base, users, packCredits: null }).bandId).toBe(bandId);
    }
  });
});

describe("pricing-v2-contract: PRICING_PUBLIC_ENABLED", () => {
  it("predvolene vypnuté; zapína len true / 1 / on (rovnaká sémantika ako PRICING_V2_ENABLED)", () => {
    expect(isPricingPublicEnabled({})).toBe(false);
    expect(isPricingPublicEnabled({ PRICING_PUBLIC_ENABLED: "" })).toBe(false);
    for (const raw of ["false", "0", "off", "yes", "enabled", "2", "true;"]) {
      expect(isPricingPublicEnabled({ PRICING_PUBLIC_ENABLED: raw })).toBe(false);
    }
    for (const raw of ["true", "TRUE", " 1 ", " On "]) {
      expect(isPricingPublicEnabled({ PRICING_PUBLIC_ENABLED: raw })).toBe(true);
    }
  });
});

describe("pricing-v2-contract: kupón akcie 9/12", () => {
  const env = { STRIPE_COUPON_V3_ANNUAL_PROMO: "FAKE_COUPON_ID" };
  const before = new Date("2026-11-15T10:00:00Z");

  it("kupón sa v tomto variante checkoutu nepoužíva", () => {
    expect(resolveAnnualPromoCouponId("year", before, env)).toBeNull();
    expect(resolveAnnualPromoCouponId("year", new Date("2026-12-31T22:59:59Z"), env)).toBeNull();
    expect(resolveAnnualPromoCouponId("year", new Date("2026-12-31T22:59:59.001Z"), env)).toBeNull();
    expect(resolveAnnualPromoCouponId("year", new Date("2027-03-01T00:00:00Z"), env)).toBeNull();
    expect(resolveAnnualPromoCouponId("month", before, env)).toBeNull();
  });

  it("chýbajúce alebo placeholder env kupón nepridá", () => {
    expect(resolveAnnualPromoCouponId("year", before, {})).toBeNull();
    expect(resolveAnnualPromoCouponId("year", before, { STRIPE_COUPON_V3_ANNUAL_PROMO: "  " })).toBeNull();
    expect(resolveAnnualPromoCouponId("year", before, { STRIPE_COUPON_V3_ANNUAL_PROMO: "coupon_xxx" })).toBeNull();
  });
});
