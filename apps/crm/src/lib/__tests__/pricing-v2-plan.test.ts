import { describe, expect, it } from "vitest";
import { pricingV2BandOfPriceId, planItemOf, planPriceIdOf, saasPlanKeyFromPriceId } from "@/lib/pricing-v2-plan";

const ENV = {
  STRIPE_PRICE_V3_SEAT_MONTHLY: "price_1V3seatMonthly01",
  STRIPE_PRICE_V3_SEAT_YEARLY: "price_1V3seatYearly001",
  STRIPE_PRICE_V3_PACK_50: "price_1V3pack50Abcdef",
  STRIPE_PRICE_V3_PACK_100: "price_1V3pack100Abcde",
  STRIPE_PRICE_V3_CREDIT: "price_1V3creditAbcdef",
  STRIPE_PRICE_STARTER: "price_1LegacyStarterAb",
  STRIPE_PRICE_PRO: "price_1LegacyProAbcdef",
  STRIPE_PRICE_SCALE: "price_1LegacyScaleAbcd",
};

describe("pricingV2BandOfPriceId", () => {
  it("pásmo vyplýva z quantity licencie (1 / 2–5 / 6–10 / 11+), balík a kredit nie sú pásmo", () => {
    const seat = ENV.STRIPE_PRICE_V3_SEAT_MONTHLY;
    expect(pricingV2BandOfPriceId(seat, ENV, 1)).toBe("start");
    expect(pricingV2BandOfPriceId(seat, ENV, 2)).toBe("team");
    expect(pricingV2BandOfPriceId(seat, ENV, 5)).toBe("team");
    expect(pricingV2BandOfPriceId(seat, ENV, 6)).toBe("office");
    expect(pricingV2BandOfPriceId(seat, ENV, 10)).toBe("office");
    expect(pricingV2BandOfPriceId(seat, ENV, 11)).toBe("network");
    expect(pricingV2BandOfPriceId(ENV.STRIPE_PRICE_V3_SEAT_YEARLY, ENV, 3)).toBe("team");
    expect(pricingV2BandOfPriceId(ENV.STRIPE_PRICE_V3_PACK_50, ENV, 3)).toBeNull();
    expect(pricingV2BandOfPriceId(ENV.STRIPE_PRICE_V3_CREDIT, ENV, 3)).toBeNull();
  });

  it("licencia bez quantity alebo s neplatnou quantity pásmo nedáva", () => {
    const seat = ENV.STRIPE_PRICE_V3_SEAT_MONTHLY;
    expect(pricingV2BandOfPriceId(seat, ENV)).toBeNull();
    for (const q of [null, 0, -2, 1.5]) expect(pricingV2BandOfPriceId(seat, ENV, q)).toBeNull();
  });

  it("nenastavená alebo placeholder env premenná nikdy nič nezhodne (undefined === undefined)", () => {
    expect(pricingV2BandOfPriceId("price_1Whatever12345", {}, 3)).toBeNull();
    expect(pricingV2BandOfPriceId(undefined, {}, 3)).toBeNull();
    expect(pricingV2BandOfPriceId("price_xxx", { STRIPE_PRICE_V3_SEAT_MONTHLY: "price_xxx" }, 3)).toBeNull();
    expect(pricingV2BandOfPriceId("", ENV, 3)).toBeNull();
  });
});

describe("planPriceIdOf / planItemOf", () => {
  it("licencia v3 vyhráva, aj keď je balík kreditov prvá položka", () => {
    const items = [
      { priceId: ENV.STRIPE_PRICE_V3_PACK_50, quantity: 1 },
      { priceId: ENV.STRIPE_PRICE_V3_SEAT_MONTHLY, quantity: 4 },
    ];
    expect(planPriceIdOf(items, ENV)).toBe(ENV.STRIPE_PRICE_V3_SEAT_MONTHLY);
    expect(planItemOf(items, ENV)).toEqual({ priceId: ENV.STRIPE_PRICE_V3_SEAT_MONTHLY, quantity: 4 });
  });

  it("legacy predplatné: prvá položka ako doteraz", () => {
    const items = [{ priceId: ENV.STRIPE_PRICE_PRO }, { priceId: "price_1Another12345" }];
    expect(planPriceIdOf(items, ENV)).toBe(ENV.STRIPE_PRICE_PRO);
  });

  it("prázdne alebo chýbajúce položky vrátia null", () => {
    expect(planPriceIdOf([], ENV)).toBeNull();
    expect(planPriceIdOf(null, ENV)).toBeNull();
    expect(planPriceIdOf(undefined, ENV)).toBeNull();
    expect(planPriceIdOf([{ priceId: null }], ENV)).toBeNull();
    expect(planItemOf([], ENV)).toBeNull();
  });
});

describe("saasPlanKeyFromPriceId", () => {
  it("licencia dáva plán podľa quantity: 1 → starter, 2–5 → pro, 6+ → scale", () => {
    const seat = ENV.STRIPE_PRICE_V3_SEAT_MONTHLY;
    expect(saasPlanKeyFromPriceId(seat, ENV, 1)).toBe("starter");
    expect(saasPlanKeyFromPriceId(seat, ENV, 3)).toBe("pro");
    expect(saasPlanKeyFromPriceId(seat, ENV, 5)).toBe("pro");
    expect(saasPlanKeyFromPriceId(seat, ENV, 6)).toBe("scale");
    expect(saasPlanKeyFromPriceId(seat, ENV, 11)).toBe("scale");
    expect(saasPlanKeyFromPriceId(ENV.STRIPE_PRICE_V3_SEAT_YEARLY, ENV, 8)).toBe("scale");
  });

  it("licencia bez známej quantity je najnižší platený plán (starter), nikdy free", () => {
    expect(saasPlanKeyFromPriceId(ENV.STRIPE_PRICE_V3_SEAT_MONTHLY, ENV)).toBe("starter");
    expect(saasPlanKeyFromPriceId(ENV.STRIPE_PRICE_V3_SEAT_YEARLY, ENV, 0)).toBe("starter");
  });

  it("legacy ceny sa správajú ako doteraz", () => {
    expect(saasPlanKeyFromPriceId(ENV.STRIPE_PRICE_STARTER, ENV)).toBe("starter");
    expect(saasPlanKeyFromPriceId(ENV.STRIPE_PRICE_PRO, ENV)).toBe("pro");
    expect(saasPlanKeyFromPriceId(ENV.STRIPE_PRICE_SCALE, ENV)).toBe("scale");
  });

  it("balík, kredit, neznáma a prázdna cena sú free", () => {
    expect(saasPlanKeyFromPriceId(ENV.STRIPE_PRICE_V3_PACK_50, ENV, 3)).toBe("free");
    expect(saasPlanKeyFromPriceId(ENV.STRIPE_PRICE_V3_CREDIT, ENV, 3)).toBe("free");
    expect(saasPlanKeyFromPriceId("price_1Unknown123456", ENV)).toBe("free");
    expect(saasPlanKeyFromPriceId(null, ENV)).toBe("free");
    expect(saasPlanKeyFromPriceId("", ENV)).toBe("free");
  });

  it("bez nastavených env premenných nič nezhodne so začiatkom 'undefined'", () => {
    expect(saasPlanKeyFromPriceId("price_1Whatever12345", {})).toBe("free");
  });
});
