import { describe, expect, it } from "vitest";
import { buildPricingV2Catalog } from "@/lib/pricing-v2";
import {
  creditUnitLine,
  formatEurFromCents,
  getPricingV2CatalogIfEnabled,
  grossPriceLine,
  monthlyCreditsLine,
  netPriceLine,
  packPriceLine,
  usersRangeLabel,
} from "../pricing-v2-copy";

const n = (s: string) => s.replace(/ /g, " ");

describe("W2-D pricing-v2-copy", () => {
  it("prepínač: predvolene vypnutý, zapína len true/1/on", () => {
    expect(getPricingV2CatalogIfEnabled({})).toBeNull();
    expect(getPricingV2CatalogIfEnabled({ PRICING_V2_ENABLED: "" })).toBeNull();
    expect(getPricingV2CatalogIfEnabled({ PRICING_V2_ENABLED: "false" })).toBeNull();
    expect(getPricingV2CatalogIfEnabled({ PRICING_V2_ENABLED: "yes" })).toBeNull();
    for (const on of ["true", "1", "on", " TRUE "]) {
      expect(getPricingV2CatalogIfEnabled({ PRICING_V2_ENABLED: on })).toEqual(buildPricingV2Catalog());
    }
  });

  it("formát eur: celé a s centmi", () => {
    expect(n(formatEurFromCents(2500))).toBe("25 €");
    expect(n(formatEurFromCents(3075))).toBe("30,75 €");
    expect(n(formatEurFromCents(70))).toBe("0,70 €");
    expect(n(formatEurFromCents(8600))).toBe("86 €");
    expect(n(formatEurFromCents(2505))).toBe("25,05 €");
  });

  it("riadky pásiem presne podľa schváleného cenníka (nezávislý oracle z roadmapy §9.5)", () => {
    const c = buildPricingV2Catalog();
    const expected = [
      ["1 používateľ", "25 € mesačne bez DPH", "30,75 € s DPH 23 %", "20 kreditov mesačne pre celú kanceláriu"],
      ["2–6 používateľov", "60 € mesačne bez DPH", "73,80 € s DPH 23 %", "50 kreditov mesačne pre celú kanceláriu"],
      ["7–25 používateľov", "149 € mesačne bez DPH", "183,27 € s DPH 23 %", "100 kreditov mesačne pre celú kanceláriu"],
      ["26 a viac používateľov", "od 349 € mesačne bez DPH", "od 429,27 € s DPH 23 %", "150 kreditov mesačne pre celú kanceláriu"],
    ];
    c.bands.forEach((b, i) => {
      expect(n(usersRangeLabel(b))).toBe(expected[i][0]);
      expect(n(netPriceLine(b))).toBe(expected[i][1]);
      expect(n(grossPriceLine(b, c.vatPercent))).toBe(expected[i][2]);
      expect(monthlyCreditsLine(b)).toBe(expected[i][3]);
    });
  });

  it("balíky a jednotka kreditu", () => {
    const c = buildPricingV2Catalog();
    expect(n(packPriceLine(c.packs[0], c.vatPercent))).toBe(
      "60 kreditov mesačne navyše: 34 € mesačne bez DPH (41,82 € s DPH 23 %)",
    );
    expect(n(packPriceLine(c.packs[4], c.vatPercent))).toBe(
      "300 kreditov mesačne navyše: 129 € mesačne bez DPH (158,67 € s DPH 23 %)",
    );
    expect(n(creditUnitLine(c))).toBe("0,70 € za kredit bez DPH (0,86 € s DPH 23 %)");
  });
});
