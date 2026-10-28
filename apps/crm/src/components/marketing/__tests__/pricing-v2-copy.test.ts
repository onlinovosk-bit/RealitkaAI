import { describe, expect, it } from "vitest";
import { buildPricingV2Catalog } from "@/lib/pricing-v2";
import {
  ANNUAL_PROMO_HEADLINE,
  annualPromoLines,
  creditUnitLine,
  formatEurFromCents,
  GUARANTEE_TEXT,
  getPricingV2CatalogIfEnabled,
  grossPriceLine,
  monthlyBillingLine,
  monthlyCreditsLine,
  netPriceLine,
  packPriceLine,
  unlockCtaLabelV2,
  usersRangeLabel,
} from "../pricing-v2-copy";
import { getPublicPricingCatalog } from "../public-pricing";

const n = (s: string) => s.replace(/ /g, " ");

describe("pricing-v2-copy (cenník v3)", () => {
  it("prepínač v2: predvolene vypnutý, zapína len true/1/on", () => {
    expect(getPricingV2CatalogIfEnabled({})).toBeNull();
    expect(getPricingV2CatalogIfEnabled({ PRICING_V2_ENABLED: "" })).toBeNull();
    expect(getPricingV2CatalogIfEnabled({ PRICING_V2_ENABLED: "false" })).toBeNull();
    expect(getPricingV2CatalogIfEnabled({ PRICING_V2_ENABLED: "yes" })).toBeNull();
    for (const on of ["true", "1", "on", " TRUE "]) {
      expect(getPricingV2CatalogIfEnabled({ PRICING_V2_ENABLED: on })).toEqual(buildPricingV2Catalog());
    }
  });

  it("verejný katalóg: predvolene null; zapnutie len PUBLIC samo nestačí, treba aj V2", () => {
    expect(getPublicPricingCatalog({})).toBeNull();
    expect(getPublicPricingCatalog({ PRICING_V2_ENABLED: "true" })).toBeNull();
    expect(getPublicPricingCatalog({ PRICING_PUBLIC_ENABLED: "true" })).toBeNull();
    for (const bad of ["", "false", "0", "off", "yes"]) {
      expect(getPublicPricingCatalog({ PRICING_V2_ENABLED: "true", PRICING_PUBLIC_ENABLED: bad })).toBeNull();
    }
    for (const on of ["true", "1", "on", " ON "]) {
      const c = getPublicPricingCatalog({ PRICING_V2_ENABLED: "true", PRICING_PUBLIC_ENABLED: on, PRICING_V2_PLANS_ONLY: "false" });
      expect(c).toEqual(buildPricingV2Catalog());
    }
  });

  it("verejný katalóg v režime „len plány“ (predvolený) nenesie balíky kreditov", () => {
    const c = getPublicPricingCatalog({ PRICING_V2_ENABLED: "true", PRICING_PUBLIC_ENABLED: "true" });
    expect(c).not.toBeNull();
    expect(c?.packs).toEqual([]);
    expect(c?.bands).toHaveLength(4);
  });

  it("formát eur: celé a s centmi", () => {
    expect(n(formatEurFromCents(2500))).toBe("25 €");
    expect(n(formatEurFromCents(3075))).toBe("30,75 €");
    expect(n(formatEurFromCents(75))).toBe("0,75 €");
    expect(n(formatEurFromCents(8600))).toBe("86 €");
    expect(n(formatEurFromCents(2505))).toBe("25,05 €");
  });

  it("riadky pásiem presne podľa cenníka v3 (nezávislý oracle zo spec §1)", () => {
    const c = buildPricingV2Catalog();
    // [rozsah, základ pri ročnej platbe, s DPH 23 %, mesačná platba, ročne o 17 % lacnejšie, kredity]
    const expected = [
      ["1 maklér", "25 € mesačne bez DPH pri ročnej platbe", "30,75 € s DPH 23 %", "30 € mesačne bez DPH pri mesačnej platbe (ročne o 17 % lacnejšie)", "25 kreditov mesačne pre celú kanceláriu"],
      ["2–5 maklérov", "od 50 € mesačne bez DPH pri ročnej platbe", "od 61,50 € s DPH 23 %", "od 60 € mesačne bez DPH pri mesačnej platbe (ročne o 17 % lacnejšie)", "60 kreditov mesačne pre celú kanceláriu"],
      ["6–10 maklérov", "od 74 € mesačne bez DPH pri ročnej platbe", "od 91,02 € s DPH 23 %", "od 88,80 € mesačne bez DPH pri mesačnej platbe (ročne o 17 % lacnejšie)", "120 kreditov mesačne pre celú kanceláriu"],
      ["11 a viac maklérov", "od 116 € mesačne bez DPH pri ročnej platbe", "od 142,68 € s DPH 23 %", "od 139,20 € mesačne bez DPH pri mesačnej platbe (ročne o 17 % lacnejšie)", "175 kreditov mesačne pre celú kanceláriu"],
    ];
    c.bands.forEach((b, i) => {
      expect(n(usersRangeLabel(b))).toBe(expected[i][0]);
      expect(n(netPriceLine(b))).toBe(expected[i][1]);
      expect(n(grossPriceLine(b, c.vatPercent))).toBe(expected[i][2]);
      expect(n(monthlyBillingLine(b))).toBe(expected[i][3]);
      expect(monthlyCreditsLine(b)).toBe(expected[i][4]);
    });
  });

  it("balíky 50–300 a jednotka kreditu 0,75 €", () => {
    const c = buildPricingV2Catalog();
    expect(c.packs.map((p) => p.credits)).toEqual([50, 100, 150, 200, 250, 300]);
    expect(n(packPriceLine(c.packs[0], c.vatPercent))).toBe(
      "50 kreditov mesačne navyše: 26 € mesačne bez DPH (31,98 € s DPH 23 %)",
    );
    expect(n(packPriceLine(c.packs[5], c.vatPercent))).toBe(
      "300 kreditov mesačne navyše: 131 € mesačne bez DPH (161,13 € s DPH 23 %)",
    );
    expect(n(creditUnitLine(c))).toBe("0,75 € za kredit bez DPH (0,92 € s DPH 23 %)");
  });

  it("akcia 9/12: text len kým je akcia aktívna; garancia má jediné znenie", () => {
    const active = buildPricingV2Catalog(23, new Date("2026-11-01T10:00:00Z"));
    const expired = buildPricingV2Catalog(23, new Date("2027-01-01T00:00:00Z"));
    expect(annualPromoLines(active)[0]).toBe("Prvý rok 3 mesiace zadarmo (platíte 9 z 12)");
    expect(annualPromoLines(active)[0]).toBe(ANNUAL_PROMO_HEADLINE);
    expect(annualPromoLines(expired)).toEqual([]);
    expect(GUARANTEE_TEXT).toBe("100 % vrátenie peňazí do 30 dní – bez otázok");
  });

  it("CTA zamknutého obsahu uvádza cenu pri ročnej platbe", () => {
    expect(n(unlockCtaLabelV2(buildPricingV2Catalog()))).toBe(
      "Odomknúť ďalšie príležitosti — plány od 25 € mesačne bez DPH pri ročnej platbe",
    );
  });
});
