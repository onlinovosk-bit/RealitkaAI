/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import ObjectionFaq from "../sections/ObjectionFaq";
import { expectMatchesGolden, FORBIDDEN_CLIENT_NAMES, htmlText, LEGACY_PRICE_TOKEN } from "@/components/marketing/__tests__/golden";
import { buildPricingV2Catalog } from "@/lib/pricing-v2";

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

describe("ObjectionFaq: vypnutý prepínač", () => {
  it("všetky stavy sú zhodné bajt po bajte s pôvodným (golden z commitu 4e57283)", () => {
    expectMatchesGolden(__dirname, "objection-faq-legacy", allStates(<ObjectionFaq />));
  });
});

describe("ObjectionFaq: zapnutý prepínač", () => {
  const catalog = buildPricingV2Catalog();
  const states = allStates(<ObjectionFaq pricingV2={catalog} />);
  const text = htmlText(states).replace(/&nbsp;/g, " ");

  it("pricingV2={null} je zhodné bajt po bajte s pôvodným", () => {
    expectMatchesGolden(__dirname, "objection-faq-legacy", allStates(<ObjectionFaq pricingV2={null} />));
  });
  it("ukáže cenu z katalógu (čistá aj s DPH) a žiadne staré ceny ani Starter", () => {
    expect(text).toContain("začínajú na 25 € mesačne bez DPH (30,75 € s DPH 23 %)");
    expect(text).not.toMatch(LEGACY_PRICE_TOKEN);
    expect(text).not.toMatch(/Starter|Smart Start|stojí 49/);
  });
  it("neslúbi garanciu vrátenia (pre v2 nerozhodnutá) a nepomenúva klienta", () => {
    expect(text).not.toMatch(/garanci/i);
    expect(text).not.toMatch(FORBIDDEN_CLIENT_NAMES);
    expect(text).not.toContain("Môžem to vyskúšať bez záväzku?");
  });
  it("odpoveď o malej kancelárii vychádza z pásiem katalógu", () => {
    expect(text).toContain("plán Start je pre 1 používateľ");
    expect(text).toContain("plán Team pre 2–6 používateľov");
  });
});
