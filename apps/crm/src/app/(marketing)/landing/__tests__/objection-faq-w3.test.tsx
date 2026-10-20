/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import ObjectionFaq from "../sections/ObjectionFaq";
import { FORBIDDEN_CLIENT_NAMES, htmlText, LEGACY_PRICE_TOKEN } from "@/components/marketing/__tests__/golden";
import { buildPricingV2Catalog } from "@/lib/pricing-v2";
import { getPublicPricingCatalog } from "@/components/marketing/public-pricing";

afterEach(cleanup);

/** Postupne otvorí každú položku FAQ a zreťazí HTML všetkých stavov. */
function allStates(ui: React.ReactElement): string {
  const { container, getAllByRole } = render(ui);
  const out: string[] = [container.innerHTML];
  const n = getAllByRole("button").length;
  for (let i = 0; i < n; i++) {
    fireEvent.click(getAllByRole("button")[i]);
    out.push(container.innerHTML);
  }
  const joined = out.join("\n<!--state-->\n");
  cleanup();
  return joined;
}

const GUARANTEE = "100 % vrátenie peňazí do 30 dní – bez otázok";

describe("ObjectionFaq: PRICING_PUBLIC_ENABLED vypnuté (predvolené)", () => {
  for (const [name, el] of [
    ["bez prop", <ObjectionFaq key="a" />],
    ["pricingV2=null", <ObjectionFaq key="b" pricingV2={null} />],
    ["getPublicPricingCatalog({})", <ObjectionFaq key="c" pricingV2={getPublicPricingCatalog({})} />],
  ] as const) {
    it(`${name}: vo všetkých stavoch žiadne „€“, žiadna cena plánu, garancia v jedinom znení`, () => {
      const states = allStates(el);
      const text = htmlText(states).replace(/&nbsp;/g, " ");
      expect(states).not.toContain("€");
      expect(text).not.toMatch(LEGACY_PRICE_TOKEN);
      expect(text).not.toMatch(/Starter|Smart Start|stojí \d/);
      expect(text).toContain("Cenu vám pošleme na vyžiadanie");
      expect(text).toContain(GUARANTEE);
      expect(text).not.toMatch(/pilot|\+\s?50|každý cent|30-dňov/i);
      expect(text).not.toMatch(FORBIDDEN_CLIENT_NAMES);
    });
  }
});

describe("ObjectionFaq: PRICING_PUBLIC_ENABLED zapnuté (cenník v3)", () => {
  const catalog = buildPricingV2Catalog();
  const states = allStates(<ObjectionFaq pricingV2={catalog} />);
  const text = htmlText(states).replace(/&nbsp;/g, " ");

  it("ukáže cenu z katalógu (čistá aj s DPH, pri ročnej platbe) a žiadne staré ceny ani Starter", () => {
    expect(text).toContain("začína na 25 € mesačne bez DPH pri ročnej platbe (30,75 € s DPH 23 %)");
    expect(text).not.toMatch(LEGACY_PRICE_TOKEN);
    expect(text).not.toMatch(/Starter|Smart Start|stojí 49/);
  });
  it("garancia má jediné znenie a otázka o vyskúšaní ostáva", () => {
    expect(text).toContain("Môžem to vyskúšať bez záväzku?");
    expect(text).toContain(GUARANTEE);
    expect(text).not.toMatch(/pilot|\+\s?50|každý cent|30-dňov/i);
    expect(text).not.toMatch(FORBIDDEN_CLIENT_NAMES);
  });
  it("odpoveď o malej kancelárii vychádza z pásiem 1 / 2–5 / 6–10 / 11+", () => {
    expect(text).toContain("pásmo sa nastaví samo podľa počtu maklérov (1 / 2–5 / 6–10 / 11 a viac)");
  });
});
