import { describe, expect, it } from "vitest";
import {
  PRICING_V2_BANDS,
  PRICING_V2_CREDIT_NET_CENTS,
  PRICING_V2_MONTHLY_PACKS,
  buildPricingV2Catalog,
  grossCentsFromNet,
  isPricingV2Enabled,
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
    for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(resolvePricingV2Band(bad)).toEqual({ ok: false, reason: "invalid_user_count" });
    }
    expect(resolvePricingV2Band("3" as unknown as number)).toEqual({ ok: false, reason: "invalid_user_count" });
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

  it("pri inej sadzbe DPH sa čistá cena nemení", () => {
    for (const vat of [0, 20, 23]) {
      const a = priceFromNetCents(14900, vat);
      expect(a.netCents).toBe(14900);
      expect(a.grossCents - a.vatCents).toBe(14900);
    }
    expect(grossCentsFromNet(14900, 0)).toBe(14900);
  });

  it("neplatná sadzba DPH zlyhá nahlas, nie tichou zlou sumou", () => {
    expect(() => grossCentsFromNet(2500, -1)).toThrow(RangeError);
    expect(() => grossCentsFromNet(2500, Number.NaN)).toThrow(RangeError);
    expect(() => buildPricingV2Catalog(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it("dokúpený kredit stojí 0,70 € bez DPH; neplatný počet nič neúčtuje", () => {
    expect(PRICING_V2_CREDIT_NET_CENTS).toBe(70);
    expect(priceExtraCredits(10)?.netCents).toBe(700);
    expect(priceExtraCredits(10)?.grossCents).toBe(861);
    for (const bad of [0, -5, 2.5, Number.NaN]) {
      expect(priceExtraCredits(bad)).toBeNull();
    }
  });
});

describe("pricing-v2: grant kreditov", () => {
  it("grant patrí kancelárii 25 / 60 / 120 / 175 a nezávisí od počtu používateľov", () => {
    expect(PRICING_V2_BANDS.map((b) => monthlyOfficeGrantCredits(b.id))).toEqual([25, 60, 120, 175]);
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
    expect(c.packs).toHaveLength(5);
    for (const p of c.packs) {
      expect(p.grossCents).toBe(p.netCents + p.vatCents);
    }
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
  });

  it("kancelária s legacy predplatným ostáva na legacy aj pri zapnutom v2", () => {
    expect(resolvePricingModel({ v2Enabled: true, hasLegacySubscription: true })).toBe("legacy");
    expect(resolvePricingModel({ v2Enabled: false, hasLegacySubscription: true })).toBe("legacy");
  });

  it("nová kancelária dostane v2 len keď je prepínač zapnutý", () => {
    expect(resolvePricingModel({ v2Enabled: false, hasLegacySubscription: false })).toBe("legacy");
    expect(resolvePricingModel({ v2Enabled: true, hasLegacySubscription: false })).toBe("v2");
  });
});
