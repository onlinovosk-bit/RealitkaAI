import { describe, expect, it } from "vitest";
import {
  PRICING_V2_ANNUAL_MONTHS,
  PRICING_V2_BANDS,
  PRICING_V2_CREDIT_NET_CENTS,
  PRICING_V2_MONTHLY_PACKS,
  PRICING_V3_PROMO_UNTIL,
  PRICING_V3_SEAT_TIERS,
  PRICING_VERSION,
  annualNetCents,
  annualPromoNetCents,
  buildPricingV2Catalog,
  graduatedTierNetCents,
  grossCentsFromNet,
  isAnnualPromoActive,
  isPricingV2Enabled,
  isPricingV2Interval,
  isPricingV2PlansOnly,
  licenseBaseMonthlyNetCents,
  licenseNetCents,
  monthlyOfficeGrantCredits,
  priceExtraCredits,
  priceFromNetCents,
  quotePricingV2License,
  resolvePricingModel,
  resolvePricingV2Band,
  resolvePricingV2BandResult,
} from "@/lib/pricing-v2";

/** Kontrolné body zo zadania: n → základ (mesačne pri ročnej fakturácii). */
const CHECKPOINTS: Array<[number, number]> = [
  [1, 2500],
  [2, 5000],
  [3, 6500],
  [5, 6500],
  [6, 7400],
  [7, 8300],
  [10, 11000],
  [11, 11600],
  [20, 17000],
  [21, 17500],
  [30, 22000],
  [50, 32000],
];

describe("pricing-v2: verzia", () => {
  it("cenník je v3 a termín akcie je 31. 12. 2026 22:59:59Z", () => {
    expect(PRICING_VERSION).toBe("v3");
    expect(PRICING_V3_PROMO_UNTIL).toBe("2026-12-31T22:59:59Z");
  });
});

describe("pricing-v2: licencia podľa počtu maklérov", () => {
  it("základ sedí na všetkých kontrolných bodoch", () => {
    for (const [n, base] of CHECKPOINTS) expect(licenseBaseMonthlyNetCents(n)).toBe(base);
  });

  it("ročná platba = 12 × základ na všetkých kontrolných bodoch", () => {
    for (const [n, base] of CHECKPOINTS) expect(licenseNetCents(n, "year")).toBe(12 * base);
  });

  it("mesačná platba = základ × 1,2 presne v centoch na všetkých kontrolných bodoch", () => {
    const expected: Record<number, number> = {
      1: 3000, 2: 6000, 3: 7800, 5: 7800, 6: 8880, 7: 9960, 10: 13200, 11: 13920, 20: 20400, 21: 21000, 30: 26400, 50: 38400,
    };
    for (const [n, base] of CHECKPOINTS) {
      expect(licenseNetCents(n, "month")).toBe(expected[n]);
      expect(licenseNetCents(n, "month") * 5).toBe(base * 6);
    }
  });

  it("prírastky: +1080 / +720 / +600 mesačne za makléra nad 5 / 10 / 20", () => {
    expect(licenseNetCents(6, "month") - licenseNetCents(5, "month")).toBe(1080);
    expect(licenseNetCents(10, "month") - licenseNetCents(9, "month")).toBe(1080);
    expect(licenseNetCents(11, "month") - licenseNetCents(10, "month")).toBe(720);
    expect(licenseNetCents(20, "month") - licenseNetCents(19, "month")).toBe(720);
    expect(licenseNetCents(21, "month") - licenseNetCents(20, "month")).toBe(600);
    expect(licenseNetCents(60, "month") - licenseNetCents(59, "month")).toBe(600);
  });

  it("cena s počtom maklérov nikdy neklesá (1..200) a od 6. makléra rastie", () => {
    for (const interval of ["month", "year"] as const) {
      for (let n = 2; n <= 200; n++) {
        const prev = licenseNetCents(n - 1, interval);
        if (n >= 6 || n <= 3) expect(licenseNetCents(n, interval)).toBeGreaterThan(prev);
        else expect(licenseNetCents(n, interval)).toBe(prev);
      }
    }
  });

  it("neplatný počet maklérov alebo obdobie zlyhá nahlas", () => {
    for (const n of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 1e21, "3", null, undefined]) {
      expect(() => licenseNetCents(n as number, "year")).toThrow(RangeError);
      expect(() => licenseBaseMonthlyNetCents(n as number)).toThrow(RangeError);
    }
    expect(() => licenseNetCents(3, "week" as "month")).toThrow(RangeError);
  });
});

describe("pricing-v2: Stripe graduated tiery = vzorec", () => {
  it("tiery presne podľa zadania", () => {
    expect(PRICING_V3_SEAT_TIERS.year).toEqual([
      { up_to: 1, flat_amount: 30000, unit_amount: 0 },
      { up_to: 2, flat_amount: 30000, unit_amount: 0 },
      { up_to: 5, flat_amount: 18000, unit_amount: 0 },
      { up_to: 10, flat_amount: 0, unit_amount: 10800 },
      { up_to: 20, flat_amount: 0, unit_amount: 7200 },
      { up_to: null, flat_amount: 0, unit_amount: 6000 },
    ]);
    expect(PRICING_V3_SEAT_TIERS.month).toEqual([
      { up_to: 1, flat_amount: 3000, unit_amount: 0 },
      { up_to: 2, flat_amount: 3000, unit_amount: 0 },
      { up_to: 5, flat_amount: 1800, unit_amount: 0 },
      { up_to: 10, flat_amount: 0, unit_amount: 1080 },
      { up_to: 20, flat_amount: 0, unit_amount: 720 },
      { up_to: null, flat_amount: 0, unit_amount: 600 },
    ]);
  });

  it("simulácia graduated = licenseNetCents pre n = 1..60, ročne aj mesačne", () => {
    for (let n = 1; n <= 60; n++) {
      expect(graduatedTierNetCents(PRICING_V3_SEAT_TIERS.year, n)).toBe(licenseNetCents(n, "year"));
      expect(graduatedTierNetCents(PRICING_V3_SEAT_TIERS.month, n)).toBe(licenseNetCents(n, "month"));
    }
  });

  it("simulácia odmietne neplatné množstvo", () => {
    expect(() => graduatedTierNetCents(PRICING_V3_SEAT_TIERS.year, 0)).toThrow(RangeError);
  });

  it("tiery sú zmrazené", () => {
    expect(Object.isFrozen(PRICING_V3_SEAT_TIERS.year)).toBe(true);
    expect(Object.isFrozen(PRICING_V3_SEAT_TIERS.year[0])).toBe(true);
  });
});

describe("pricing-v2: akcia 9 z 12 pri ročnej platbe", () => {
  it("prvá ročná faktúra = 9 × základ = 75 % z bežnej ročnej ceny", () => {
    expect(PRICING_V2_ANNUAL_MONTHS).toBe(12);
    for (const [n, base] of CHECKPOINTS) {
      expect(annualPromoNetCents(n)).toBe(9 * base);
      expect(annualPromoNetCents(n) * 4).toBe(licenseNetCents(n, "year") * 3);
    }
  });

  it("isAnnualPromoActive: platí do termínu vrátane, po ňom nie", () => {
    expect(isAnnualPromoActive(new Date("2026-10-19T08:00:00Z"))).toBe(true);
    expect(isAnnualPromoActive(new Date("2026-12-31T22:59:58Z"))).toBe(true);
    expect(isAnnualPromoActive(new Date("2026-12-31T22:59:59Z"))).toBe(true);
    expect(isAnnualPromoActive(new Date("2026-12-31T22:59:59.001Z"))).toBe(false);
    expect(isAnnualPromoActive(new Date("2027-01-01T00:00:00Z"))).toBe(false);
    expect(isAnnualPromoActive(new Date(Number.NaN))).toBe(false);
  });

  it("termín 22:59:59Z = 23:59:59 v Bratislave (zimný čas, UTC+1)", () => {
    expect(new Date(PRICING_V3_PROMO_UNTIL).getTime()).toBe(Date.parse("2026-12-31T23:59:59+01:00"));
  });
});

describe("pricing-v2: pásma", () => {
  it("hranice 1 / 2–5 / 6–10 / 11+ vyberú správne pásmo", () => {
    expect(resolvePricingV2Band(1)).toBe("start");
    expect(resolvePricingV2Band(2)).toBe("team");
    expect(resolvePricingV2Band(5)).toBe("team");
    expect(resolvePricingV2Band(6)).toBe("office");
    expect(resolvePricingV2Band(10)).toBe("office");
    expect(resolvePricingV2Band(11)).toBe("network");
    expect(resolvePricingV2Band(500)).toBe("network");
  });

  it("nulový, záporný, desatinný a nekonečný počet vyhodí výnimku (výsledková varianta vráti invalid_user_count)", () => {
    const bad: unknown[] = [
      0, -0, -1, 1.5, 6.0000001, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
      1e21, Number.MAX_SAFE_INTEGER + 2, "3", "", null, undefined, {}, [3], true,
    ];
    for (const value of bad) {
      expect(() => resolvePricingV2Band(value as number)).toThrow(RangeError);
      expect(resolvePricingV2BandResult(value as number)).toEqual({ ok: false, reason: "invalid_user_count" });
    }
  });

  it("pásma sa na seba bez medzery a bez prekryvu nadväzujú", () => {
    expect(PRICING_V2_BANDS[0].minUsers).toBe(1);
    for (let i = 1; i < PRICING_V2_BANDS.length; i++) {
      const prevMax = PRICING_V2_BANDS[i - 1].maxUsers;
      expect(prevMax).not.toBeNull();
      expect(PRICING_V2_BANDS[i].minUsers).toBe((prevMax as number) + 1);
    }
    expect(PRICING_V2_BANDS[PRICING_V2_BANDS.length - 1].maxUsers).toBeNull();
  });

  it("základ pásma = základ pri jeho minUsers", () => {
    for (const b of PRICING_V2_BANDS) expect(b.netCents).toBe(licenseBaseMonthlyNetCents(b.minUsers));
  });
});

describe("pricing-v2: ceny a DPH", () => {
  it("konečná cena sa zaokrúhľuje na cent obvyklým spôsobom (polovica hore, nie nadol)", () => {
    expect(grossCentsFromNet(50)).toBe(62); // 61,5
    expect(grossCentsFromNet(3333)).toBe(4100); // 4099,59
    expect(grossCentsFromNet(3330)).toBe(4096); // 4095,9
  });

  it("konečná cena základu pásiem s 23 % DPH na cent", () => {
    expect(PRICING_V2_BANDS.map((b) => priceFromNetCents(b.netCents).grossCents)).toEqual([3075, 6150, 9102, 14268]);
  });

  it("pri inej sadzbe DPH sa čistá cena nemení a konečná sa prepočíta (0 % a 20 %)", () => {
    const nets = PRICING_V2_BANDS.map((b) => b.netCents);
    expect(nets.map((n) => priceFromNetCents(n, 0).grossCents)).toEqual([2500, 5000, 7400, 11600]);
    expect(nets.map((n) => priceFromNetCents(n, 20).grossCents)).toEqual([3000, 6000, 8880, 13920]);
    for (const vat of [0, 20, 23]) {
      for (const n of nets) expect(priceFromNetCents(n, vat).netCents).toBe(n);
    }
  });

  it("neplatná sadzba DPH zlyhá nahlas, nie tichou zlou sumou", () => {
    for (const vat of [-1, Number.NaN, Number.POSITIVE_INFINITY, 101, 1e9, 1e308]) {
      expect(() => grossCentsFromNet(2500, vat)).toThrow(RangeError);
      expect(() => buildPricingV2Catalog(vat)).toThrow(RangeError);
      expect(() => quotePricingV2License(3, vat)).toThrow(RangeError);
    }
  });

  it("neplatný základ ceny zlyhá nahlas (záporný, desatinný, NaN, nečíselný)", () => {
    for (const net of [-100, 0.5, Number.NaN, Number.MAX_SAFE_INTEGER + 2, undefined, "100"]) {
      expect(() => grossCentsFromNet(net as number)).toThrow(RangeError);
    }
    expect(grossCentsFromNet(0)).toBe(0);
  });

  it("dokúpený kredit stojí 0,75 € bez DPH; neplatný počet nič neúčtuje", () => {
    expect(PRICING_V2_CREDIT_NET_CENTS).toBe(75);
    expect(priceExtraCredits(10)?.netCents).toBe(750);
    expect(priceExtraCredits(10)?.grossCents).toBe(923); // 922,5
    for (const bad of [0, -5, 2.5, Number.NaN, 1e21, Number.MAX_SAFE_INTEGER, "5", null, undefined]) {
      expect(priceExtraCredits(bad as number)).toBeNull();
    }
    expect(priceExtraCredits(1_000_000)?.netCents).toBe(75_000_000);
  });

  it("quotePricingV2License nesie všetky varianty pre 6 maklérov", () => {
    const q = quotePricingV2License(6);
    expect(q.bandId).toBe("office");
    expect(q.baseMonthly.netCents).toBe(7400);
    expect(q.monthly.netCents).toBe(8880);
    expect(q.annual.netCents).toBe(88800);
    expect(q.annualPromoFirstYear.netCents).toBe(66600);
    expect(q.annual.grossCents).toBe(109224);
  });
});

describe("pricing-v2: grant kreditov", () => {
  it("grant patrí kancelárii 25 / 60 / 120 / 175 a nezávisí od počtu používateľov", () => {
    expect(PRICING_V2_BANDS.map((b) => monthlyOfficeGrantCredits(b.id))).toEqual([25, 60, 120, 175]);
    const sixBand = PRICING_V2_BANDS.find((b) => b.id === resolvePricingV2Band(6));
    const tenBand = PRICING_V2_BANDS.find((b) => b.id === resolvePricingV2Band(10));
    expect(sixBand?.monthlyCredits).toBe(tenBand?.monthlyCredits);
  });
});

describe("pricing-v2: mesačné balíky", () => {
  it("veľkosti 50/100/150/200/250/300 a ceny bez DPH 26/51/74/94/114/131 €", () => {
    expect(PRICING_V2_MONTHLY_PACKS.map((p) => p.credits)).toEqual([50, 100, 150, 200, 250, 300]);
    expect(PRICING_V2_MONTHLY_PACKS.map((p) => p.netCents)).toEqual([2600, 5100, 7400, 9400, 11400, 13100]);
  });

  it("konečné ceny balíkov s 23 % DPH na cent", () => {
    expect(PRICING_V2_MONTHLY_PACKS.map((p) => priceFromNetCents(p.netCents).grossCents)).toEqual([
      3198, 6273, 9102, 11562, 14022, 16113,
    ]);
  });

  it("cena za kredit v balíku klesá s veľkosťou a je pod samostatným kreditom", () => {
    const perCredit = PRICING_V2_MONTHLY_PACKS.map((p) => p.netCents / p.credits);
    for (let i = 0; i < perCredit.length; i++) {
      expect(perCredit[i]).toBeLessThan(PRICING_V2_CREDIT_NET_CENTS);
      if (i > 0) expect(perCredit[i]).toBeLessThan(perCredit[i - 1]);
    }
  });
});

describe("pricing-v2: katalóg (API kontrakt)", () => {
  it("nesie čistú aj konečnú cenu pre pásma, balíky aj kredit", () => {
    const c = buildPricingV2Catalog(23, new Date("2026-11-01T00:00:00Z"));
    expect(c.version).toBe("v3");
    expect(c.vatPercent).toBe(23);
    expect(c.creditUnit).toEqual({ netCents: 75, vatCents: 17, grossCents: 92 });
    expect(c.bands.map((b) => [b.id, b.netCents, b.grossCents])).toEqual([
      ["start", 2500, 3075],
      ["team", 5000, 6150],
      ["office", 7400, 9102],
      ["network", 11600, 14268],
    ]);
    expect(c.bands.map((b) => b.isFromPrice)).toEqual([false, true, true, true]);
    expect(c.bands.map((b) => b.seat.extraSeatBaseMonthlyNetCents)).toEqual([null, null, 900, 600]);
    expect(c.bands.map((b) => b.annual.netCents)).toEqual([30000, 60000, 88800, 139200]);
    expect(c.bands.map((b) => b.monthly.netCents)).toEqual([3000, 6000, 8880, 13920]);
    expect(c.packs.map((p) => [p.credits, p.netCents, p.grossCents])).toEqual([
      [50, 2600, 3198],
      [100, 5100, 6273],
      [150, 7400, 9102],
      [200, 9400, 11562],
      [250, 11400, 14022],
      [300, 13100, 16113],
    ]);
    expect(c.promo).toEqual({ until: PRICING_V3_PROMO_UNTIL, active: true, paidMonths: 9, totalMonths: 12 });
    expect(c.tiers.year).toBe(PRICING_V3_SEAT_TIERS.year);
  });

  it("promo v katalógu sa po termíne vypne", () => {
    expect(buildPricingV2Catalog(23, new Date("2027-01-02T00:00:00Z")).promo.active).toBe(false);
  });

  it("katalóg pri 0 % a 20 % DPH má nezmenený základ a prepočítanú konečnú cenu", () => {
    const zero = buildPricingV2Catalog(0);
    const twenty = buildPricingV2Catalog(20);
    expect(zero.bands.map((b) => b.grossCents)).toEqual([2500, 5000, 7400, 11600]);
    expect(twenty.bands.map((b) => b.grossCents)).toEqual([3000, 6000, 8880, 13920]);
    expect(twenty.bands.map((b) => b.netCents)).toEqual([2500, 5000, 7400, 11600]);
    expect(twenty.creditUnit.grossCents).toBe(90);
  });

  it("cenník nejde za behu prepísať (zmrazené)", () => {
    expect(Object.isFrozen(PRICING_V2_BANDS)).toBe(true);
    expect(Object.isFrozen(PRICING_V2_MONTHLY_PACKS)).toBe(true);
    for (const b of PRICING_V2_BANDS) expect(Object.isFrozen(b)).toBe(true);
    for (const p of PRICING_V2_MONTHLY_PACKS) expect(Object.isFrozen(p)).toBe(true);
    expect(() => {
      (PRICING_V2_BANDS[0] as { netCents: number }).netCents = 1;
    }).toThrow(TypeError);
  });
});

describe("pricing-v2: prepínač a ochrana existujúceho klienta", () => {
  it("v2 je predvolene vypnuté a zapína ho len výslovná hodnota", () => {
    expect(isPricingV2Enabled({})).toBe(false);
    expect(isPricingV2Enabled({ PRICING_V2_ENABLED: "" })).toBe(false);
    expect(isPricingV2Enabled({ PRICING_V2_ENABLED: "false" })).toBe(false);
    expect(isPricingV2Enabled({ PRICING_V2_ENABLED: "yes please" })).toBe(false);
    expect(isPricingV2Enabled({ PRICING_V2_ENABLED: "TRUE" })).toBe(true);
    expect(isPricingV2Enabled({ PRICING_V2_ENABLED: " 1 " })).toBe(true);
    expect(isPricingV2Enabled({ PRICING_V2_ENABLED: " ON " })).toBe(true);
    for (const raw of ["0", "off", "enabled", "2", "true;"]) {
      expect(isPricingV2Enabled({ PRICING_V2_ENABLED: raw })).toBe(false);
    }
  });

  it("kancelária s legacy predplatným ostáva na legacy aj pri zapnutom v2", () => {
    expect(resolvePricingModel({ v2Enabled: true, hasLegacySubscription: true })).toBe("legacy");
    expect(resolvePricingModel({ v2Enabled: false, hasLegacySubscription: true })).toBe("legacy");
  });

  it("chýbajúca alebo nečitateľná informácia o legacy predplatnom znamená legacy (fail-closed)", () => {
    const missing = { v2Enabled: true } as unknown as { v2Enabled: boolean; hasLegacySubscription: boolean };
    expect(resolvePricingModel(missing)).toBe("legacy");
    for (const raw of [undefined, null, "false", 0, ""]) {
      expect(
        resolvePricingModel({ v2Enabled: true, hasLegacySubscription: raw as unknown as boolean }),
      ).toBe("legacy");
    }
  });

  it("v2 sa nezapne z reťazca ani z iného než presné true", () => {
    for (const raw of ["true", "false", 1, "1", null, undefined]) {
      expect(
        resolvePricingModel({ v2Enabled: raw as unknown as boolean, hasLegacySubscription: false }),
      ).toBe("legacy");
    }
  });

  it("nová kancelária dostane v2 len keď je prepínač zapnutý", () => {
    expect(resolvePricingModel({ v2Enabled: false, hasLegacySubscription: false })).toBe("legacy");
    expect(resolvePricingModel({ v2Enabled: true, hasLegacySubscription: false })).toBe("v2");
  });
});

describe("isPricingV2PlansOnly (fail-closed)", () => {
  it("predvolene zapnuté", () => {
    expect(isPricingV2PlansOnly({})).toBe(true);
    expect(isPricingV2PlansOnly({ PRICING_V2_PLANS_ONLY: "" })).toBe(true);
    expect(isPricingV2PlansOnly({ PRICING_V2_PLANS_ONLY: "true" })).toBe(true);
    expect(isPricingV2PlansOnly({ PRICING_V2_PLANS_ONLY: "nonsense" })).toBe(true);
  });
  it("vypína len výslovné false / 0 / off", () => {
    for (const v of ["false", "0", "off", " FALSE ", "Off"]) {
      expect(isPricingV2PlansOnly({ PRICING_V2_PLANS_ONLY: v })).toBe(false);
    }
  });
});

describe("pricing-v2: ročný základ", () => {
  it("annualNetCents = 12 × mesačný", () => {
    expect(PRICING_V2_BANDS.map((b) => annualNetCents(b.netCents))).toEqual([30000, 60000, 88800, 139200]);
  });

  it("neplatný základ a nebezpečne veľké číslo sa odmietnu", () => {
    expect(() => annualNetCents(-1)).toThrow(RangeError);
    expect(() => annualNetCents(1.5)).toThrow(RangeError);
    expect(() => annualNetCents(Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });

  it("isPricingV2Interval prijme len month a year", () => {
    for (const ok of ["month", "year"]) expect(isPricingV2Interval(ok)).toBe(true);
    for (const bad of ["YEAR", "weekly", "", null, undefined, 12]) expect(isPricingV2Interval(bad)).toBe(false);
  });
});
