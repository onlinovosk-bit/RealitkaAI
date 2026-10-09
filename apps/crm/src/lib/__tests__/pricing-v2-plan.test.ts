import { describe, expect, it } from "vitest";
import { pricingV2BandOfPriceId, planPriceIdOf, saasPlanKeyFromPriceId } from "@/lib/pricing-v2-plan";

const ENV = {
  STRIPE_PRICE_V2_START: "price_1V2startAbcdefg",
  STRIPE_PRICE_V2_TEAM: "price_1V2teamAbcdefgh",
  STRIPE_PRICE_V2_OFFICE: "price_1V2officeAbcdef",
  STRIPE_PRICE_V2_NETWORK: "price_1V2networkAbcde",
  STRIPE_PRICE_V2_PACK_60: "price_1V2pack60Abcdef",
  STRIPE_PRICE_V2_PACK_120: "price_1V2pack120Abcde",
  STRIPE_PRICE_V2_CREDIT: "price_1V2creditAbcdef",
  STRIPE_PRICE_STARTER: "price_1LegacyStarterAb",
  STRIPE_PRICE_PRO: "price_1LegacyProAbcdef",
  STRIPE_PRICE_SCALE: "price_1LegacyScaleAbcd",
};

describe("pricingV2BandOfPriceId", () => {
  it("rozpozná pásma, balík a kredit nie sú pásmo", () => {
    expect(pricingV2BandOfPriceId(ENV.STRIPE_PRICE_V2_START, ENV)).toBe("start");
    expect(pricingV2BandOfPriceId(ENV.STRIPE_PRICE_V2_TEAM, ENV)).toBe("team");
    expect(pricingV2BandOfPriceId(ENV.STRIPE_PRICE_V2_OFFICE, ENV)).toBe("office");
    expect(pricingV2BandOfPriceId(ENV.STRIPE_PRICE_V2_NETWORK, ENV)).toBe("network");
    expect(pricingV2BandOfPriceId(ENV.STRIPE_PRICE_V2_PACK_60, ENV)).toBeNull();
    expect(pricingV2BandOfPriceId(ENV.STRIPE_PRICE_V2_CREDIT, ENV)).toBeNull();
  });

  it("nenastavená alebo placeholder env premenná nikdy nič nezhodne (undefined === undefined)", () => {
    expect(pricingV2BandOfPriceId("price_1Whatever12345", {})).toBeNull();
    expect(pricingV2BandOfPriceId(undefined, {})).toBeNull();
    expect(pricingV2BandOfPriceId("price_xxx", { STRIPE_PRICE_V2_TEAM: "price_xxx" })).toBeNull();
    expect(pricingV2BandOfPriceId("", ENV)).toBeNull();
  });
});

describe("planPriceIdOf", () => {
  it("pásmo v2 vyhráva, aj keď je balík kreditov prvá položka", () => {
    const items = [{ priceId: ENV.STRIPE_PRICE_V2_PACK_60 }, { priceId: ENV.STRIPE_PRICE_V2_TEAM }];
    expect(planPriceIdOf(items, ENV)).toBe(ENV.STRIPE_PRICE_V2_TEAM);
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
  });
});

describe("saasPlanKeyFromPriceId", () => {
  it("v2 pásma dávajú plán, nie free: start → starter, team → pro, office a network → scale", () => {
    expect(saasPlanKeyFromPriceId(ENV.STRIPE_PRICE_V2_START, ENV)).toBe("starter");
    expect(saasPlanKeyFromPriceId(ENV.STRIPE_PRICE_V2_TEAM, ENV)).toBe("pro");
    expect(saasPlanKeyFromPriceId(ENV.STRIPE_PRICE_V2_OFFICE, ENV)).toBe("scale");
    expect(saasPlanKeyFromPriceId(ENV.STRIPE_PRICE_V2_NETWORK, ENV)).toBe("scale");
  });

  it("legacy ceny sa správajú ako doteraz", () => {
    expect(saasPlanKeyFromPriceId(ENV.STRIPE_PRICE_STARTER, ENV)).toBe("starter");
    expect(saasPlanKeyFromPriceId(ENV.STRIPE_PRICE_PRO, ENV)).toBe("pro");
    expect(saasPlanKeyFromPriceId(ENV.STRIPE_PRICE_SCALE, ENV)).toBe("scale");
  });

  it("balík, kredit, neznáma a prázdna cena sú free", () => {
    expect(saasPlanKeyFromPriceId(ENV.STRIPE_PRICE_V2_PACK_60, ENV)).toBe("free");
    expect(saasPlanKeyFromPriceId(ENV.STRIPE_PRICE_V2_CREDIT, ENV)).toBe("free");
    expect(saasPlanKeyFromPriceId("price_1Unknown123456", ENV)).toBe("free");
    expect(saasPlanKeyFromPriceId(null, ENV)).toBe("free");
    expect(saasPlanKeyFromPriceId("", ENV)).toBe("free");
  });

  it("bez nastavených env premenných nič nezhodne so začiatkom 'undefined'", () => {
    expect(saasPlanKeyFromPriceId("price_1Whatever12345", {})).toBe("free");
  });
});
