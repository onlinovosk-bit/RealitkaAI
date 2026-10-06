// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DailyActionPanel from "../DailyActionPanel";
import PriorityLeads from "../priority-leads";
import PaywallLock from "@/components/shared/PaywallLock";
import { expectMatchesGolden, htmlText, LEGACY_PRICE_TOKEN } from "@/components/marketing/__tests__/golden";
import { PricingV2Provider } from "@/components/marketing/pricing-v2-context";
import { buildPricingV2Catalog } from "@/lib/pricing-v2";
import type { Lead } from "@/lib/leads-store";

const leads = Array.from({ length: 6 }, (_, i) => ({
  id: `l${i}`,
  name: `Lead ${i}`,
  status: "Horúci",
  score: 95 - i,
  phone: "",
  lastContact: null,
})) as unknown as Lead[];

describe("Paywall CTA: vypnutý prepínač", () => {
  it("DailyActionPanel zhodný bajt po bajte", () => {
    expectMatchesGolden(__dirname, "daily-action-legacy", renderToStaticMarkup(<DailyActionPanel leads={leads} plan="free" />));
  });
  it("PriorityLeads zhodný bajt po bajte", () => {
    expectMatchesGolden(__dirname, "priority-leads-legacy", renderToStaticMarkup(<PriorityLeads leads={leads} plan="free" />));
  });
  it("PaywallLock s predvoleným textom zhodný bajt po bajte", () => {
    expectMatchesGolden(__dirname, "paywall-lock-default-legacy", renderToStaticMarkup(<PaywallLock lockedCount={3} />));
  });
});

describe("Paywall CTA: zapnutý prepínač", () => {
  const catalog = buildPricingV2Catalog();
  const wrap = (ui: React.ReactElement) => renderToStaticMarkup(<PricingV2Provider catalog={catalog}>{ui}</PricingV2Provider>);
  const expectV2 = (html: string) => {
    const t = htmlText(html);
    expect(t).toContain("plány od 25 € mesačne bez DPH");
    expect(t).not.toMatch(LEGACY_PRICE_TOKEN);
    expect(t).not.toMatch(/Protocol Authority|Smart Start/);
  };
  it("DailyActionPanel", () => expectV2(wrap(<DailyActionPanel leads={leads} plan="free" />)));
  it("PriorityLeads", () => expectV2(wrap(<PriorityLeads leads={leads} plan="free" />)));
  it("PaywallLock s predvoleným textom", () => expectV2(wrap(<PaywallLock lockedCount={3} />)));
  it("provider s katalógom null = pôvodný výstup", () => {
    expectMatchesGolden(
      __dirname,
      "daily-action-legacy",
      renderToStaticMarkup(
        <PricingV2Provider catalog={null}>
          <DailyActionPanel leads={leads} plan="free" />
        </PricingV2Provider>,
      ),
    );
  });
});
