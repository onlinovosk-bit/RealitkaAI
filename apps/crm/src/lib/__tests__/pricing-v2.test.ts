import { describe, expect, it } from "vitest";
import {
  PRICING_V2_BANDS,
  PRICING_V2_CREDIT_NET_CENTS,
  PRICING_V2_MONTHLY_PACKS,
  buildPricingV2Catalog,
  grossCentsFromNet,
  annualNetCents,
  isPricingV2Enabled,
  isPricingV2Interval,
  isPricingV2PlansOnly,
  monthlyOfficeGrantCredits,
  priceExtraCredits,
  priceFromNetCents,
  resolvePricingModel,
  resolvePricingV2Band,
} from "@/lib/pricing-v2";

function bandIdFor(users: number): string | null {
  const r = resolvePricingV2Band(users);
  return r.ok ? r.band.id : null;
}

describe("pricing-v2: pásma", () => {
  it("hranice 1/2/6/7/25/26 vyberú správne pásmo", () => {
    expect(bandIdFor(1)).toBe("start");
    expect(bandIdFor(2)).toBe("team");
    expect(bandIdFor(6)).toBe("team");
    expect(bandIdFor(7)).toBe("office");
    expect(bandIdFor(25)).toBe("office");
    expect(bandIdFor(26)).toBe("network");
    expect(bandIdFor(500)).toBe("network");
  });

  it("nulový, záporný, desatinný a nekonečný počet nevyberie žiadne pásmo", () => {
    const bad: unknown[] = [
      0, -0, -1, 1.5, 6.0000001, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
      1e21, Number.MAX_SAFE_INTEGER + 2, "3", "", null, undefined, {}, [3], true,
    ];
    for (const value of bad) {
      expect(resolvePricingV2Band(value as number)).toEqual({ ok: false, reason: "invalid_user_count" });
    }
  });

  it("väčšie počty (27, 1000) patria do Siete", () => {
    expect(bandIdFor(27)).toBe("network");
    expect(bandIdFor(1000)).toBe("network");
  });

  it("pásma sa na seba bez medzery a bez prekryvu nadväzujú", () => {
    for (let i = 1; i < PRICING_V2_BANDS.length; i++) {
      const prevMax = PRICING_V2_BANDS[i - 1].maxUsers;
      expect(prevMax).not.toBeNull();
      expect(PRICING_V2_BANDS[i].minUsers).toBe((prevMax as number) + 1);
    }
    expect(PRICING_V2_BANDS[PRICING_V2_BANDS.length - 1].maxUsers).toBeNull();
  });
});

describe("pricing-v2: ceny a DPH", () => {
  it("čisté ceny 25 / 60 / 149 / 349 € a konečné ceny s 23 % DPH na cent", () => {
    const net = PRICING_V2_BANDS.map((b) => b.netCents);
    expect(net).toEqual([2500, 6000, 14900, 34900]);
    const gross = PRICING_V2_BANDS.map((b) => priceFromNetCents(b.netCents).grossCents);
    expect(gross).toEqual([3075, 7380, 18327, 42927]);
  });

  it("konečná cena sa zaokrúhľuje na cent obvyklým spôsobom (polovica hore, nie nadol)", () => {
    expect(grossCentsFromNet(50)).toBe(62); // 61,5
    expect(grossCentsFromNet(3333)).toBe(4100); // 4099,59
    expect(grossCentsFromNet(3330)).toBe(4096); // 4095,9
  });

  it("pri inej sadzbe DPH sa čistá cena nemení a konečná sa prepočíta (0 % a 20 %)", () => {
    const nets = PRICING_V2_BANDS.map((b) => b.netCents);
    expect(nets.map((n) => priceFromNetCents(n, 0).grossCents)).toEqual([2500, 6000, 14900, 34900]);
    expect(nets.map((n) => priceFromNetCents(n, 20).grossCents)).toEqual([3000, 7200, 17880, 41880]);
    for (const vat of [0, 20, 23]) {
      for (const n of nets) expect(priceFromNetCents(n, vat).netCents).toBe(n);
    }
  });

  it("neplatná sadzba DPH zlyhá nahlas, nie tichou zlou sumou", () => {
    for (const vat of [-1, Number.NaN, Number.POSITIVE_INFINITY, 101, 1e9, 1e308]) {
      expect(() => grossCentsFromNet(2500, vat)).toThrow(RangeError);
      expect(() => buildPricingV2Catalog(vat)).toThrow(RangeError);
    }
  });

  it("neplatný základ ceny zlyhá nahlas (záporný, desatinný, NaN, nečíselný)", () => {
    for (const net of [-100, 0.5, Number.NaN, Number.MAX_SAFE_INTEGER + 2, undefined, "100"]) {
      expect(() => grossCentsFromNet(net as number)).toThrow(RangeError);
    }
    expect(grossCentsFromNet(0)).toBe(0);
  });

  it("dokúpený kredit stojí 0,70 € bez DPH; neplatný počet nič neúčtuje", () => {
    expect(PRICING_V2_CREDIT_NET_CENTS).toBe(70);
    expect(priceExtraCredits(10)?.netCents).toBe(700);
    expect(priceExtraCredits(10)?.grossCents).toBe(861);
    for (const bad of [0, -5, 2.5, Number.NaN, 1e21, Number.MAX_SAFE_INTEGER, "5", null, undefined]) {
      expect(priceExtraCredits(bad as number)).toBeNull();
    }
    expect(priceExtraCredits(1_000_000)?.netCents).toBe(70_000_000);
  });
});

describe("pricing-v2: grant kreditov", () => {
  it("grant patrí kancelárii 20 / 50 / 100 / 150 a nezávisí od počtu používateľov", () => {
    expect(PRICING_V2_BANDS.map((b) => monthlyOfficeGrantCredits(b.id))).toEqual([20, 50, 100, 150]);
    const six = resolvePricingV2Band(6);
    const two = resolvePricingV2Band(2);
    expect(six.ok && two.ok && six.band.monthlyCredits === two.band.monthlyCredits).toBe(true);
  });
});

describe("pricing-v2: mesačné balíky", () => {
  it("veľkosti 60/120/180/240/300 a ceny bez DPH 34/62/86/108/129 €", () => {
    expect(PRICING_V2_MONTHLY_PACKS.map((p) => p.credits)).toEqual([60, 120, 180, 240, 300]);
    expect(PRICING_V2_MONTHLY_PACKS.map((p) => p.netCents)).toEqual([3400, 6200, 8600, 10800, 12900]);
  });

  it("konečné ceny balíkov s 23 % DPH na cent: 41,82 / 76,26 / 105,78 / 132,84 / 158,67 €", () => {
    expect(PRICING_V2_MONTHLY_PACKS.map((p) => priceFromNetCents(p.netCents).grossCents)).toEqual([
      4182, 7626, 10578, 13284, 15867,
    ]);
  });

  it("cena za kredit v balíku klesá s veľkosťou a je pod samostatným kreditom", () => {
    const perCredit = PRICING_V2_MONTHLY_PACKS.map((p) => p.netCents / p.credits);
    for (let i = 0; i < perCredit.length; i++) {
      expect(perCredit[i]).toBeLessThan(PRICING_V2_CREDIT_NET_CENTS);
      if (i > 0) expect(perCredit[i]).toBeLessThan(perCredit[i - 1]);
    }
  });

  it("v každom balíku sme o 1–4 centy na kredit lacnejší než AIRAmax pri rovnakom počte (interpolácia)", () => {
    // Snímka cenníka AIRAmax z 5. 10. 2026; základ DPH u nich NEOVERENÝ. Body: [kredity, cena v centoch].
    const theirs: Array<[number, number]> = [
      [50, 3000],
      [100, 5500],
      [150, 7800],
      [200, 9800],
      [250, 11800],
      [300, 13500],
    ];
    const theirTotalAt = (credits: number): number => {
      const hi = theirs.findIndex(([c]) => c >= credits);
      if (theirs[hi][0] === credits) return theirs[hi][1];
      const [c0, p0] = theirs[hi - 1];
      const [c1, p1] = theirs[hi];
      return p0 + ((p1 - p0) * (credits - c0)) / (c1 - c0);
    };
    for (const p of PRICING_V2_MONTHLY_PACKS) {
      const diffCents = theirTotalAt(p.credits) / p.credits - p.netCents / p.credits;
      expect(diffCents).toBeGreaterThanOrEqual(1);
      expect(diffCents).toBeLessThanOrEqual(4);
    }
  });
});

describe("pricing-v2: katalóg (API kontrakt)", () => {
  it("nesie čistú aj konečnú cenu pre pásma, balíky aj kredit", () => {
    const c = buildPricingV2Catalog();
    expect(c.vatPercent).toBe(23);
    expect(c.creditUnit).toEqual({ netCents: 70, vatCents: 16, grossCents: 86 });
    expect(c.bands.map((b) => [b.id, b.netCents, b.grossCents])).toEqual([
      ["start", 2500, 3075],
      ["team", 6000, 7380],
      ["office", 14900, 18327],
      ["network", 34900, 42927],
    ]);
    expect(c.bands.find((b) => b.id === "network")?.isFromPrice).toBe(true);
    expect(c.packs.map((p) => [p.credits, p.netCents, p.grossCents])).toEqual([
      [60, 3400, 4182],
      [120, 6200, 7626],
      [180, 8600, 10578],
      [240, 10800, 13284],
      [300, 12900, 15867],
    ]);
  });

  it("katalóg pri 0 % a 20 % DPH má nezmenený základ a prepočítanú konečnú cenu", () => {
    const zero = buildPricingV2Catalog(0);
    const twenty = buildPricingV2Catalog(20);
    expect(zero.bands.map((b) => b.grossCents)).toEqual([2500, 6000, 14900, 34900]);
    expect(twenty.bands.map((b) => b.grossCents)).toEqual([3000, 7200, 17880, 41880]);
    expect(twenty.bands.map((b) => b.netCents)).toEqual([2500, 6000, 14900, 34900]);
    expect(twenty.creditUnit.grossCents).toBe(84);
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

describe("pricing-v2: ročné platenie (12 × mesačná, bez zľavy)", () => {
  it("ročný základ je presne 12 × mesačný pre všetky pásma", () => {
    expect(PRICING_V2_BANDS.map((b) => annualNetCents(b.netCents))).toEqual([30000, 72000, 178800, 418800]);
  });

  it("katalóg nesie ročnú čistú aj konečnú cenu (23 % DPH na cent)", () => {
    const bands = buildPricingV2Catalog().bands;
    expect(bands.map((b) => b.annual.netCents)).toEqual([30000, 72000, 178800, 418800]);
    expect(bands.map((b) => b.annual.grossCents)).toEqual([36900, 88560, 219924, 515124]);
    expect(bands.map((b) => b.annual.vatCents)).toEqual([6900, 16560, 41124, 96324]);
    // mesačné polia ostali nezmenené
    expect(bands.map((b) => b.netCents)).toEqual([2500, 6000, 14900, 34900]);
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
