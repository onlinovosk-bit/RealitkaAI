// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import TermsPage from "../page";
import { FORBIDDEN_CLIENT_NAMES, htmlText, LEGACY_PRICE_TOKEN } from "@/components/marketing/__tests__/golden";

afterEach(() => vi.unstubAllEnvs());

const GUARANTEE = "100 % vrátenie peňazí do 30 dní – bez otázok";

describe("VOP: verejná stránka nikdy neukáže sumu, kým nie je PRICING_PUBLIC_ENABLED", () => {
  const variants: Array<[string, Record<string, string>]> = [
    ["všetko vypnuté", {}],
    ["nesprávna hodnota V2", { PRICING_V2_ENABLED: "false" }],
    ["V2 zapnuté, PUBLIC vypnuté", { PRICING_V2_ENABLED: "true" }],
    ["PUBLIC zapnuté bez V2", { PRICING_PUBLIC_ENABLED: "true" }],
  ];

  it.each(variants)("%s: HTML neobsahuje „€“ ani legacy ceny", (_name, env) => {
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    const html = renderToStaticMarkup(<TermsPage />);
    const t = htmlText(html);
    expect(html).not.toContain("€");
    expect(t).not.toMatch(LEGACY_PRICE_TOKEN);
    expect(t).not.toMatch(/\+\s?50|každý cent/i);
    expect(t).not.toMatch(FORBIDDEN_CLIENT_NAMES);
  });

  it("V2 vypnuté: pôvodný text programov (Solo/Team/Office Seat) bez súm", () => {
    const t = htmlText(renderToStaticMarkup(<TermsPage />));
    expect(t).toContain("Solo Seat");
    expect(t).toContain("2. júna 2026");
    expect(t).toContain("cenu vám pošleme na vyžiadanie");
  });

  it("V2 zapnuté, PUBLIC vypnuté: návrh VOP s „Cenu vám pošleme na vyžiadanie“ a garanciou", () => {
    vi.stubEnv("PRICING_V2_ENABLED", "true");
    const t = htmlText(renderToStaticMarkup(<TermsPage />));
    expect(t).toContain("NÁVRH VOP");
    expect(t).toContain("Cenu vám pošleme na vyžiadanie");
    expect(t).toContain(`Garancia: ${GUARANTEE}`);
    expect(t).not.toContain("Solo Seat");
  });
});

describe("VOP: zapnuté V2 aj PRICING_PUBLIC_ENABLED (NÁVRH, cenník v3)", () => {
  const render = () => {
    vi.stubEnv("PRICING_V2_ENABLED", "true");
    vi.stubEnv("PRICING_PUBLIC_ENABLED", "true");
    vi.stubEnv("PRICING_V2_PLANS_ONLY", "false");
    return htmlText(renderToStaticMarkup(<TermsPage />));
  };

  it("ukáže pásma s čistou aj konečnou cenou z katalógu", () => {
    const t = render();
    expect(t).toContain("Start — 1 maklér (25 € mesačne bez DPH pri ročnej platbe; 30,75 € s DPH 23 %)");
    expect(t).toContain("Team — 2–5 maklérov (65 € mesačne bez DPH pri ročnej platbe; 79,95 € s DPH 23 %)");
    expect(t).toContain("Kancelária — 6–10 maklérov (od 74 € mesačne bez DPH pri ročnej platbe; od 91,02 € s DPH 23 %)");
    expect(t).toContain("Sieť — 11 a viac maklérov (od 116 € mesačne bez DPH pri ročnej platbe; od 142,68 € s DPH 23 %)");
    expect(t).toContain("50 kreditov mesačne navyše: 26 € mesačne bez DPH (31,98 € s DPH 23 %)");
    expect(t).toContain("0,75 € za kredit bez DPH (0,92 € s DPH 23 %)");
    expect(t).not.toContain("Prvý rok 3 mesiace zadarmo");
  });

  it("nenesie žiadne zvyšky starých cien ani Owner Cockpit ani meno referenčného klienta", () => {
    const t = render();
    expect(t).not.toMatch(LEGACY_PRICE_TOKEN);
    expect(t).not.toMatch(/cockpit/i);
    expect(t).not.toMatch(FORBIDDEN_CLIENT_NAMES);
    expect(t).not.toContain("Solo Seat");
    expect(t).not.toContain("2. júna 2026");
    expect(t).not.toMatch(/\+\s?50|každý cent/i);
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
    // Garancia je v jedinom znení.
    expect(t).toContain(`Garancia: ${GUARANTEE}`);
    // Žiadna vymyslená lehota, sankcia ani výpovedná doba (číslo pred dňami/mesiacmi) mimo schváleného znenia
    // garancie a akcie 9/12 z rozhodnutia foundera.
    const withoutDecided = t.replace(GUARANTEE, "").replace(/Prvý rok 3 mesiace zadarmo \(platíte 9 z 12\)/g, "");
    expect(withoutDecided).not.toMatch(/\d+\s*(dní|dni|dňov|dn|mesiac|týždň|rok)/i);
  });
});
