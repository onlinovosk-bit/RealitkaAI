import { describe, expect, it } from "vitest";
import {
  PRICING_V2_BAND_ACCOUNT_TIER,
  PRICING_V2_BAND_PRICE_ENV,
  PRICING_V2_CREDIT_PRICE_ENV,
  PRICING_V2_PACK_PRICE_ENV,
  buildPricingV2PlanMetadata,
  missingPricingV2PriceEnvKeys,
  parsePricingV2CheckoutRequest,
  readPricingV2CreditsMetadata,
  readPricingV2PlanMetadata,
} from "@/lib/pricing-v2-contract";
import { PRICING_V2_BAND_IDS, PRICING_V2_MONTHLY_PACKS } from "@/lib/pricing-v2";

describe("pricing-v2-contract: požiadavka na checkout", () => {
  it("plán bez balíka a s balíkom", () => {
    expect(parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2", users: 4 })).toEqual({
      ok: true,
      value: { checkoutType: "pricing_v2", users: 4, packCredits: null },
    });
    expect(parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2", users: 26, packCredits: 180 })).toEqual({
      ok: true,
      value: { checkoutType: "pricing_v2", users: 26, packCredits: 180 },
    });
    expect(parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2", users: 2, packCredits: 0 })).toEqual({
      ok: true,
      value: { checkoutType: "pricing_v2", users: 2, packCredits: null },
    });
  });

  it("neplatný počet používateľov alebo balík sa odmietne", () => {
    for (const users of [0, -1, 1.5, Number.NaN, "3", null, undefined, 1e21]) {
      expect(parsePricingV2CheckoutRequest({ checkoutType: "pricing_v2", users })).toEqual({
        ok: false,
        reason: "invalid_user_count",
      });
    }
    for (const packCredits of [50, 77, -60, "60", Number.NaN, true]) {
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
    const meta = buildPricingV2PlanMetadata({ ...base, users: 7, packCredits: 120 });
    expect(meta).toMatchObject({ checkoutType: "pricing_v2", bandId: "office", users: "7", packCredits: "120" });
    expect(readPricingV2PlanMetadata(meta)).toEqual({
      agencyId: "a-1",
      authUserId: "u-1",
      bandId: "office",
      users: 7,
      packCredits: 120,
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
    const ok = buildPricingV2PlanMetadata({ ...base, users: 3, packCredits: 60 });
    expect(readPricingV2PlanMetadata({ ...ok, bandId: "office" })).toBeNull(); // pásmo nesedí s počtom
    expect(readPricingV2PlanMetadata({ ...ok, users: "0" })).toBeNull();
    expect(readPricingV2PlanMetadata({ ...ok, users: "abc" })).toBeNull();
    expect(readPricingV2PlanMetadata({ ...ok, packCredits: "77" })).toBeNull();
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
  it("každé pásmo a každý balík má vlastný unikátny kľúč a žiadny nekoliduje so seat kľúčmi", () => {
    const names = [
      ...PRICING_V2_BAND_IDS.map((id) => PRICING_V2_BAND_PRICE_ENV[id]),
      ...PRICING_V2_MONTHLY_PACKS.map((p) => PRICING_V2_PACK_PRICE_ENV[p.credits]),
      PRICING_V2_CREDIT_PRICE_ENV,
    ];
    expect(names.every((n) => typeof n === "string" && n.startsWith("STRIPE_PRICE_V2_"))).toBe(true);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toHaveLength(4 + 5 + 1);
  });

  it("chýbajúce a placeholder ceny sa nahlásia názvom; platné nie", () => {
    const full = { PRICING_V2_PLANS_ONLY: "false" };
    const all = missingPricingV2PriceEnvKeys(full);
    expect(all).toHaveLength(10);
    const env: Record<string, string> = { ...full };
    for (const n of all) env[n] = "price_1Abcdefgh12345";
    expect(missingPricingV2PriceEnvKeys(env)).toEqual([]);
    expect(missingPricingV2PriceEnvKeys({ ...env, STRIPE_PRICE_V2_TEAM: "price_xxx" })).toEqual(["STRIPE_PRICE_V2_TEAM"]);
    expect(missingPricingV2PriceEnvKeys({ ...env, STRIPE_PRICE_V2_PACK_60: "" })).toEqual(["STRIPE_PRICE_V2_PACK_60"]);
  });

  it("režim „len plány“ (predvolený): vyžadujú sa iba 4 ceny plánov, balíky a kredit nie", () => {
    const planOnly = missingPricingV2PriceEnvKeys({});
    expect(planOnly).toEqual([
      "STRIPE_PRICE_V2_START",
      "STRIPE_PRICE_V2_TEAM",
      "STRIPE_PRICE_V2_OFFICE",
      "STRIPE_PRICE_V2_NETWORK",
    ]);
    const env = Object.fromEntries(planOnly.map((n) => [n, "price_1Abcdefgh12345"]));
    expect(missingPricingV2PriceEnvKeys(env)).toEqual([]);
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
