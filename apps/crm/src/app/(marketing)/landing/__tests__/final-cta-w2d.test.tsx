// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import FinalCTA from "../sections/FinalCTA";
import { buildPricingV2Catalog } from "@/lib/pricing-v2";
import {
  expectMatchesGolden,
  FORBIDDEN_CLIENT_NAMES,
  htmlText,
  LEGACY_PRICE_TOKEN,
} from "@/components/marketing/__tests__/golden";

vi.mock("../sections/CountdownTimer", () => ({ default: () => <span>COUNTDOWN</span> }));
vi.mock("../sections/SpotsCounter", () => ({ default: () => <span>SPOTS</span> }));

describe("W2-D FinalCTA: vypnutý prepínač", () => {
  it("výstup bez prop je zhodný bajt po bajte s pôvodným", () => {
    expectMatchesGolden(__dirname, "final-cta-legacy", renderToStaticMarkup(<FinalCTA />));
  });

  it("výstup s pricingV2=null je zhodný bajt po bajte s pôvodným", () => {
    expectMatchesGolden(__dirname, "final-cta-legacy", renderToStaticMarkup(<FinalCTA pricingV2={null} />));
  });
});

describe("W2-D FinalCTA: zapnutý prepínač", () => {
  const html = renderToStaticMarkup(<FinalCTA pricingV2={buildPricingV2Catalog()} />);
  const t = htmlText(html);

  it("vedie výsledkom a ukáže pásma s čistou aj konečnou cenou z katalógu", () => {
    expect(t).toContain("Neprídete o províziu");
    for (const s of [
      "1 používateľ",
      "25 € mesačne bez DPH",
      "30,75 € s DPH 23 %",
      "2–6 používateľov",
      "60 € mesačne bez DPH",
      "73,80 € s DPH 23 %",
      "7–25 používateľov",
      "149 € mesačne bez DPH",
      "183,27 € s DPH 23 %",
      "26 a viac používateľov",
      "od 349 € mesačne bez DPH",
      "od 429,27 € s DPH 23 %",
      "150 kreditov mesačne pre celú kanceláriu",
      "mesačné balíky od 34 € mesačne bez DPH",
      "0,70 € za kredit bez DPH (0,86 € s DPH 23 %)",
    ]) {
      expect(t).toContain(s);
    }
  });

  it("nenesie zvyšky starých cien, Owner Cockpit, odpočet, zľavu ani meno klienta", () => {
    expect(t).not.toMatch(LEGACY_PRICE_TOKEN);
    expect(t).not.toMatch(/cockpit/i);
    expect(t).not.toMatch(FORBIDDEN_CLIENT_NAMES);
    expect(t).not.toMatch(/Seat|COUNTDOWN|SPOTS|záruk|zľav/i);
  });

  it("CTA vedú do registrácie (pásma s pevnou cenou) a na podporu (Sieť), nie do Stripe", () => {
    expect(html).toContain('href="/register"');
    expect(html).toContain('href="/support"');
    expect(html).not.toMatch(/stripe/i);
    expect((html.match(/href="\/register"/g) ?? []).length).toBe(3);
  });
});
