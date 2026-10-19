// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import UnifiedDemo, { RoiCalculator } from "../UnifiedDemo";
import { CompetitionMap } from "../CompetitionMap";
import { PricingV2Provider } from "../pricing-v2-context";
import { buildPricingV2Catalog } from "@/lib/pricing-v2";
import { expectMatchesGolden, FORBIDDEN_CLIENT_NAMES, htmlText, LEGACY_PRICE_TOKEN } from "./golden";

/**
 * Tri stavy (PR1 §4): bez providera = verejný web (žiadna suma), provider s null = prihlásená aplikácia s legacy
 * cenníkom (výstup nezmenený bajt po bajte), provider s katalógom = cenník v3.
 */
describe("marketing komponenty: legacy v prihlásenej aplikácii (provider null) je nezmenený", () => {
  it("UnifiedDemo je zhodné bajt po bajte", () => {
    expectMatchesGolden(__dirname, "unified-demo-legacy", renderToStaticMarkup(<UnifiedDemo />));
  });
  it("ROI kalkulačka s providerom null je zhodná bajt po bajte", () => {
    expectMatchesGolden(
      __dirname,
      "roi-calculator-legacy",
      renderToStaticMarkup(
        <PricingV2Provider catalog={null}>
          <RoiCalculator />
        </PricingV2Provider>,
      ),
    );
  });
  it("CompetitionMap s providerom null (bez a s onUpgrade) je zhodná bajt po bajte", () => {
    expectMatchesGolden(
      __dirname,
      "competition-map-legacy",
      renderToStaticMarkup(
        <PricingV2Provider catalog={null}>
          <CompetitionMap isProtocolActive={false} />
        </PricingV2Provider>,
      ),
    );
    expectMatchesGolden(
      __dirname,
      "competition-map-upgrade-legacy",
      renderToStaticMarkup(
        <PricingV2Provider catalog={null}>
          <CompetitionMap isProtocolActive={false} onUpgrade={() => {}} />
        </PricingV2Provider>,
      ),
    );
  });
});

describe("marketing komponenty: verejný web (bez providera) neukáže žiadnu cenu", () => {
  it("ROI kalkulačka: žiadne ceny plánov ani náklady, len „Cenu vám pošleme na vyžiadanie“", () => {
    const t = htmlText(renderToStaticMarkup(<RoiCalculator />));
    expect(t).toContain("Cenu vám pošleme na vyžiadanie");
    expect(t).not.toMatch(/€\s?\/\s?mes|Náklady|bez DPH|Čistý zisk/);
    expect(t).not.toMatch(LEGACY_PRICE_TOKEN);
    expect(t).not.toMatch(/Smart Start|Active Force|Market Vision|449/);
    expect(t).not.toMatch(FORBIDDEN_CLIENT_NAMES);
  });

  it("CompetitionMap (zamknutá, bez aj s onUpgrade): bez ceny 449 a bez legacy plánu", () => {
    for (const withUpgrade of [false, true]) {
      const t = htmlText(
        renderToStaticMarkup(<CompetitionMap isProtocolActive={false} onUpgrade={withUpgrade ? () => {} : undefined} />),
      );
      expect(t).toContain("Competition Heatmap je súčasťou vybraných plánov.");
      expect(t).not.toMatch(/449|Protocol Authority|€/i);
    }
  });
});

describe("marketing komponenty: cenník v3 (provider s katalógom)", () => {
  const catalog = buildPricingV2Catalog();

  it("ROI kalkulačka: náklady a názvy z katalógu, bez DPH, bez starých cien", () => {
    const html = renderToStaticMarkup(
      <PricingV2Provider catalog={catalog}>
        <RoiCalculator />
      </PricingV2Provider>,
    );
    const t = htmlText(html);
    expect(t).toContain("Start 25€/mes bez DPH");
    expect(t).toContain("Team 65€/mes bez DPH");
    expect(t).toContain("Kancelária 74€/mes bez DPH");
    // predvolená voľba je „pro“ = Team: 65 € bez DPH
    expect(t).toContain("Náklady 65 €/mes bez DPH");
    expect(t).not.toMatch(LEGACY_PRICE_TOKEN);
    expect(t).not.toMatch(/Smart Start|Active Force|Market Vision|449/);
    expect(t).not.toMatch(FORBIDDEN_CLIENT_NAMES);
  });

  it("CompetitionMap: bez ceny 449 a bez legacy plánu Protocol Authority", () => {
    for (const withUpgrade of [false, true]) {
      const html = renderToStaticMarkup(
        <PricingV2Provider catalog={catalog}>
          <CompetitionMap isProtocolActive={false} onUpgrade={withUpgrade ? () => {} : undefined} />
        </PricingV2Provider>,
      );
      const t = htmlText(html);
      expect(t).toContain("Competition Heatmap je súčasťou vybraných plánov.");
      expect(t).toContain("Zobraziť plány");
      expect(t).not.toMatch(/449|Protocol Authority|cockpit/i);
    }
  });
});
