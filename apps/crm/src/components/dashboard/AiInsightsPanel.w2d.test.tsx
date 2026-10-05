// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import AiInsightsPanel from "./AiInsightsPanel";
import { buildPricingV2Catalog } from "@/lib/pricing-v2";
import {
  expectMatchesGolden,
  FORBIDDEN_CLIENT_NAMES,
  htmlText,
  LEGACY_PRICE_TOKEN,
} from "@/components/marketing/__tests__/golden";
import type { Lead } from "@/lib/ai-engine";

const leads: Lead[] = Array.from({ length: 8 }, (_, i) => ({
  id: `l${i}`,
  name: `Lead ${i}`,
  status: i % 2 ? "Horúci" : "Nový",
  last_contact_at: new Date(Date.UTC(2026, 8, 1 + i)).toISOString(),
  created_at: new Date(Date.UTC(2026, 7, 1)).toISOString(),
}));

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.UTC(2026, 9, 5, 12, 0, 0)));
});
afterAll(() => vi.useRealTimers());

describe("W2-D AiInsightsPanel: vypnutý prepínač", () => {
  it("free plán je zhodný bajt po bajte", () => {
    expectMatchesGolden(
      __dirname + "/__tests__",
      "ai-insights-free-legacy",
      renderToStaticMarkup(<AiInsightsPanel leads={leads} plan="free" />),
    );
  });
});

describe("W2-D AiInsightsPanel: pricingV2=null a zapnutý prepínač", () => {
  it("pricingV2=null je zhodný bajt po bajte s pôvodným", () => {
    expectMatchesGolden(
      __dirname + "/__tests__",
      "ai-insights-free-legacy",
      renderToStaticMarkup(<AiInsightsPanel leads={leads} plan="free" pricingV2={null} />),
    );
  });

  it("v2: CTA s najnižšou cenou z katalógu bez DPH, bez starých cien a plánov", () => {
    const t = htmlText(renderToStaticMarkup(<AiInsightsPanel leads={leads} plan="free" pricingV2={buildPricingV2Catalog()} />));
    expect(t).toContain("Odomknúť ďalšie príležitosti — plány od 25 € mesačne bez DPH");
    expect(t).not.toMatch(LEGACY_PRICE_TOKEN);
    expect(t).not.toMatch(/Market Vision|Smart Start|Protocol|cockpit/i);
    expect(t).not.toMatch(FORBIDDEN_CLIENT_NAMES);
  });
});
