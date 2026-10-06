// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import UnifiedDemo, { RoiCalculator } from "../UnifiedDemo";
import { CompetitionMap } from "../CompetitionMap";
import { PricingV2Provider } from "../pricing-v2-context";
import { buildPricingV2Catalog } from "@/lib/pricing-v2";
import { expectMatchesGolden, FORBIDDEN_CLIENT_NAMES, htmlText, LEGACY_PRICE_TOKEN } from "./golden";

describe("W2-D marketing komponenty: vypnutý prepínač", () => {
  it("UnifiedDemo je zhodné bajt po bajte", () => {
    expectMatchesGolden(__dirname, "unified-demo-legacy", renderToStaticMarkup(<UnifiedDemo />));
  });
  it("ROI kalkulačka je zhodná bajt po bajte", () => {
    expectMatchesGolden(__dirname, "roi-calculator-legacy", renderToStaticMarkup(<RoiCalculator />));
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
  it("CompetitionMap (zamknutá, bez onUpgrade) je zhodná bajt po bajte", () => {
    expectMatchesGolden(__dirname, "competition-map-legacy", renderToStaticMarkup(<CompetitionMap isProtocolActive={false} />));
  });
  it("CompetitionMap (zamknutá, s onUpgrade) je zhodná bajt po bajte", () => {
    expectMatchesGolden(__dirname, "competition-map-upgrade-legacy", renderToStaticMarkup(<CompetitionMap isProtocolActive={false} onUpgrade={() => {}} />));
  });
  it("CompetitionMap s providerom null je zhodná bajt po bajte", () => {
    expectMatchesGolden(
      __dirname,
      "competition-map-legacy",
      renderToStaticMarkup(
        <PricingV2Provider catalog={null}>
          <CompetitionMap isProtocolActive={false} />
        </PricingV2Provider>,
      ),
    );
  });
});

describe("W2-D marketing komponenty: zapnutý prepínač", () => {
  const catalog = buildPricingV2Catalog();

  it("ROI kalkulačka: náklady a názvy z katalógu, bez DPH, bez starých cien", () => {
    const html = renderToStaticMarkup(
      <PricingV2Provider catalog={catalog}>
        <RoiCalculator />
      </PricingV2Provider>,
    );
    const t = htmlText(html);
    expect(t).toContain("Start 25€/mes bez DPH");
    expect(t).toContain("Team 60€/mes bez DPH");
    expect(t).toContain("Kancelária 149€/mes bez DPH");
    // predvolená voľba je „pro“ = Team: 60 € bez DPH
    expect(t).toContain("Náklady 60 €/mes bez DPH");
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
