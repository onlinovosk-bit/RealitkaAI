// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import TermsPage from "../page";
import {
  expectMatchesGolden,
  FORBIDDEN_CLIENT_NAMES,
  htmlText,
  LEGACY_PRICE_TOKEN,
} from "@/components/marketing/__tests__/golden";

afterEach(() => vi.unstubAllEnvs());

describe("W2-D terms: vypnutý prepínač", () => {
  it("VOP výstup je zhodný bajt po bajte s pôvodným", () => {
    expectMatchesGolden(__dirname, "terms-legacy", renderToStaticMarkup(<TermsPage />));
  });

  it("nesprávna hodnota prepínača = stále pôvodný výstup", () => {
    vi.stubEnv("PRICING_V2_ENABLED", "false");
    expectMatchesGolden(__dirname, "terms-legacy", renderToStaticMarkup(<TermsPage />));
  });
});

describe("W2-D terms: zapnutý prepínač (NÁVRH)", () => {
  const render = () => {
    vi.stubEnv("PRICING_V2_ENABLED", "true");
    return htmlText(renderToStaticMarkup(<TermsPage />));
  };

  it("ukáže pásma s čistou aj konečnou cenou z katalógu", () => {
    const t = render();
    expect(t).toContain("Start — 1 používateľ (25 € mesačne bez DPH; 30,75 € s DPH 23 %)");
    expect(t).toContain("Team — 2–6 používateľov (60 € mesačne bez DPH; 73,80 € s DPH 23 %)");
    expect(t).toContain("Kancelária — 7–25 používateľov (149 € mesačne bez DPH; 183,27 € s DPH 23 %)");
    expect(t).toContain("Sieť — 26 a viac používateľov (od 349 € mesačne bez DPH; od 429,27 € s DPH 23 %)");
    expect(t).toContain("60 kreditov mesačne navyše: 34 € mesačne bez DPH (41,82 € s DPH 23 %)");
    expect(t).toContain("0,70 € za kredit bez DPH (0,86 € s DPH 23 %)");
  });

  it("nenesie žiadne zvyšky starých cien ani Owner Cockpit ani meno referenčného klienta", () => {
    const t = render();
    expect(t).not.toMatch(LEGACY_PRICE_TOKEN);
    expect(t).not.toMatch(/cockpit/i);
    expect(t).not.toMatch(FORBIDDEN_CLIENT_NAMES);
    expect(t).not.toContain("Solo Seat");
    expect(t).not.toContain("2. júna 2026");
  });

  it("je označené ako návrh a nedoriešené veci sú viditeľne „DOPLNIŤ — rozhodnutie foundera“", () => {
    const t = render();
    expect(t).toContain("NÁVRH VOP");
    expect(t).toContain("DOPLNIŤ — rozhodnutie foundera");
    // Každá z rozhodnutiami dotknutých klauzúl musí niesť placeholder (nie len niekde na stránke).
    const topics = [
      "DPH:",
      "Mesačné opakované platby a zrušenie:",
      "Kredity a ich platnosť:",
      "Existujúci zákazníci:",
      "Jednorazový onboarding a vrátenie platby:",
    ];
    const starts = topics.map((topic) => t.indexOf(`${topic} `, t.indexOf("5. Platby, kredity a zrušenie")));
    topics.forEach((topic, i) => {
      expect(starts[i], topic).toBeGreaterThan(-1);
      const end = i + 1 < topics.length ? starts[i + 1] : t.indexOf("Tento prehľad je skrátená verzia");
      expect(t.slice(starts[i], end), topic).toContain("DOPLNIŤ — rozhodnutie foundera");
    });
    // Žiadna vymyslená lehota, sankcia ani výpovedná doba (číslo pred dňami/mesiacmi).
    expect(t).not.toMatch(/\d+\s*(dní|dni|dňov|dn|mesiac|týždň|rok)/i);
  });
});
