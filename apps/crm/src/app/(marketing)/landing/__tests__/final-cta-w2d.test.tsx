// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FinalCTA from "../sections/FinalCTA";
import { buildPricingV2Catalog } from "@/lib/pricing-v2";
import { getPublicPricingCatalog } from "@/components/marketing/public-pricing";
import { FORBIDDEN_CLIENT_NAMES, htmlText, LEGACY_PRICE_TOKEN } from "@/components/marketing/__tests__/golden";

const GUARANTEE = "100 % vrátenie peňazí do 30 dní – bez otázok";

describe("FinalCTA: PRICING_PUBLIC_ENABLED vypnuté (predvolené) = žiadna suma", () => {
  for (const [name, node] of [
    ["bez prop", <FinalCTA key="a" />],
    ["pricingV2=null", <FinalCTA key="b" pricingV2={null} />],
    ["katalóg z getPublicPricingCatalog({})", <FinalCTA key="c" pricingV2={getPublicPricingCatalog({})} />],
    [
      "katalóg z getPublicPricingCatalog (V2 zapnuté, PUBLIC vypnuté)",
      <FinalCTA key="d" pricingV2={getPublicPricingCatalog({ PRICING_V2_ENABLED: "true" })} />,
    ],
  ] as const) {
    it(`${name}: HTML neobsahuje „€“ ani číslo ceny, ukáže „Cenu vám pošleme na vyžiadanie“ a CTA`, () => {
      const html = renderToStaticMarkup(node);
      const t = htmlText(html);
      expect(html).not.toContain("€");
      expect(html).not.toContain("&euro;");
      expect(t).not.toMatch(LEGACY_PRICE_TOKEN);
      expect(t).not.toMatch(/\d+\s?(€|eur)/i);
      expect(t).not.toMatch(/seat|odpočet|countdown|zľav/i);
      expect(t).toContain("Cenu vám pošleme na vyžiadanie");
      expect(html).toContain('href="/support"');
      expect(html).toContain('href="/demo"');
      expect(t).toContain(GUARANTEE);
      expect(t).not.toMatch(/pilot|\+\s?50|každý cent/i);
      expect(t).not.toMatch(FORBIDDEN_CLIENT_NAMES);
    });
  }

  it("landing page.tsx berie katalóg z getPublicPricingCatalog, nie z in-app prepínača (nič nejde do RSC payloadu)", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "page.tsx"), "utf8");
    expect(src).toContain("getPublicPricingCatalog()");
    expect(src).not.toContain("getPricingV2CatalogIfEnabled");
    expect(src).not.toMatch(/pilot/i);
  });
});

describe("FinalCTA: PRICING_PUBLIC_ENABLED zapnuté (cenník v3)", () => {
  const catalog = buildPricingV2Catalog(23, new Date("2026-11-01T10:00:00Z"));
  const html = renderToStaticMarkup(<FinalCTA pricingV2={catalog} />);
  const t = htmlText(html);

  it("vedie výsledkom a ukáže pásma 1 / 2–5 / 6–10 / 11+ s cenou z katalógu (čistá, s DPH, mesačná, ročne o 17 % lacnejšie)", () => {
    expect(t).toContain("Neprídete o províziu");
    for (const s of [
      "1 maklér",
      "25 € mesačne bez DPH pri ročnej platbe",
      "30,75 € s DPH 23 %",
      "30 € mesačne bez DPH pri mesačnej platbe (ročne o 17 % lacnejšie)",
      "2–5 maklérov",
      "od 50 € mesačne bez DPH pri ročnej platbe",
      "od 61,50 € s DPH 23 %",
      "6–10 maklérov",
      "od 74 € mesačne bez DPH pri ročnej platbe",
      "od 91,02 € s DPH 23 %",
      "11 a viac maklérov",
      "od 116 € mesačne bez DPH pri ročnej platbe",
      "od 142,68 € s DPH 23 %",
      "25 kreditov mesačne pre celú kanceláriu",
      "60 kreditov mesačne pre celú kanceláriu",
      "120 kreditov mesačne pre celú kanceláriu",
      "175 kreditov mesačne pre celú kanceláriu",
      "mesačné balíky od 26 € mesačne bez DPH",
      "0,75 € za kredit bez DPH (0,92 € s DPH 23 %)",
    ]) {
      expect(t).toContain(s);
    }
  });

  it("do 31. 12. 2026 ukáže akciu 9 z 12; po termíne ju neukáže", () => {
    expect(t).toContain("Prvý rok 3 mesiace zadarmo (platíte 9 z 12)");
    const after = htmlText(renderToStaticMarkup(<FinalCTA pricingV2={buildPricingV2Catalog(23, new Date("2027-01-01T00:00:00Z"))} />));
    expect(after).not.toContain("Prvý rok 3 mesiace zadarmo");
    expect(after).not.toContain("3 mesiace zadarmo");
  });

  it("nesie garanciu v jedinom znení a nenesie zvyšky starých cien, seat, odpočet, pilot ani meno klienta", () => {
    expect(t).toContain(GUARANTEE);
    expect(t).not.toMatch(LEGACY_PRICE_TOKEN);
    expect(t).not.toMatch(/cockpit|seat|COUNTDOWN|SPOTS|zľav|pilot|\+\s?50|každý cent/i);
    expect(t).not.toMatch(FORBIDDEN_CLIENT_NAMES);
  });

  it("všetky 4 CTA vedú do registrácie, nie do Stripe ani Lemon Squeezy", () => {
    expect((html.match(/href="\/register"/g) ?? []).length).toBe(4);
    expect(html).not.toMatch(/stripe/i);
    expect(html).not.toMatch(/lemon|lemonsqueezy/i);
  });
});
