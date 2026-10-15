/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import BillingPage from "../page";
import { expectMatchesGolden, htmlText, LEGACY_PRICE_TOKEN } from "@/components/marketing/__tests__/golden";
import { PricingV2Provider } from "@/components/marketing/pricing-v2-context";
import { AgencyPricingV2Provider } from "@/components/billing/v2/agency-pricing-context";
import { buildPricingV2Catalog, type PricingV2Catalog } from "@/lib/pricing-v2";
import type { AgencyPricingV2 } from "@/lib/pricing-v2-agency";

vi.mock("@/components/billing/CreditsTopupPanel", () => ({ default: () => <div data-testid="topup" /> }));
vi.mock("@/components/shared/module-shell", () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section data-title={title}>{children}</section>
  ),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const PLAN_KEYS = ["free", "starter", "active_force", "enterprise", "market_vision", "protocol_authority", "custom_x"];

const norm = (s: string) => s.replace(/&nbsp;/g, " ");

type Ctx = { catalog: PricingV2Catalog | null; agency: AgencyPricingV2 | null };

async function renderPlan(planKey: string, ctx?: Ctx): Promise<string> {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, result: { planKey }, planKey }) }) as unknown as Response),
  );
  const ui = ctx ? (
    <PricingV2Provider catalog={ctx.catalog}>
      <AgencyPricingV2Provider value={ctx.agency}>
        <BillingPage />
      </AgencyPricingV2Provider>
    </PricingV2Provider>
  ) : (
    <BillingPage />
  );
  const { container } = render(ui);
  await waitFor(() => expect(container.textContent).not.toContain("…"));
  const html = container.innerHTML;
  cleanup();
  return html;
}

async function allPlans(ctx?: Ctx): Promise<string> {
  const parts: string[] = [];
  for (const k of PLAN_KEYS) parts.push(`<!--${k}-->${await renderPlan(k, ctx)}`);
  return parts.join("\n");
}

describe("Billing stránka: vypnutý prepínač / legacy", () => {
  it("výstup pre každý planKey je zhodný bajt po bajte s pôvodným (golden z commitu 4e57283)", async () => {
    expectMatchesGolden(__dirname, "billing-page-legacy", await allPlans());
  });
});

describe("Billing stránka: zapnutý prepínač", () => {
  const catalog = buildPricingV2Catalog();

  it.each([
    ["start", "Start", "25 €", "30,75 € s DPH 23 %"],
    ["team", "Team", "60 €", "73,80 € s DPH 23 %"],
    ["office", "Kancelária", "149 €", "183,27 € s DPH 23 %"],
    ["network", "Sieť", "od 349 €", "od 429,27 € s DPH 23 %"],
  ] as const)("v2 zákazník (%s) vidí pásmo a cenu z katalógu (čistá aj s DPH), nie legacy cenu", async (bandId, label, net, gross) => {
    // planKey z legacy zdroja (Stripe) môže byť čokoľvek, aj `starter` (79 €): v2 ho musí prebiť.
    for (const legacyKey of ["starter", "active_force", "free"]) {
      const t = norm(htmlText(await renderPlan(legacyKey, { catalog, agency: { bandId } })));
      expect(t).toContain(label);
      expect(t).toContain(`${net} /mes bez DPH`);
      expect(t).toContain(gross);
      expect(t).not.toMatch(/SEAT|FREE/);
      expect(t).not.toMatch(LEGACY_PRICE_TOKEN);
    }
  });

  it("v2 zákazník bez rozpoznaného pásma: žiadna legacy cena, pomlčka", async () => {
    const t = norm(htmlText(await renderPlan("starter", { catalog, agency: { bandId: null } })));
    expect(t).not.toMatch(LEGACY_PRICE_TOKEN);
    expect(t).toContain("— /mes");
  });

  it("legacy zákazník pri zapnutom prepínači (agency null) = pôvodný výstup bajt po bajte", async () => {
    expectMatchesGolden(__dirname, "billing-page-legacy", await allPlans({ catalog, agency: null }));
  });

  it("vypnutý prepínač (katalóg null) aj pri v2 riadku agentúry = pôvodný výstup bajt po bajte", async () => {
    expectMatchesGolden(__dirname, "billing-page-legacy", await allPlans({ catalog: null, agency: { bandId: "team" } }));
  });
});
