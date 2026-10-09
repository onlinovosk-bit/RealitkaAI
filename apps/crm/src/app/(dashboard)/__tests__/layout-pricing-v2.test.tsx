// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePricingV2Catalog } from "@/components/marketing/pricing-v2-context";
import { useAgencyPricingV2 } from "@/components/billing/v2/agency-pricing-context";

const h = vi.hoisted(() => ({ selects: [] as string[], agencyRow: { pricing_model: "v2", pricing_band: "team" } as Record<string, unknown> }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1", email: "a@b.sk" } }, error: null }) },
    from: () => ({
      select: (cols: string) => {
        h.selects.push(cols);
        return {
          eq: () => ({
            maybeSingle: async () =>
              cols === "pricing_model, pricing_band" ? { data: h.agencyRow, error: null } : { data: { name: "Kancelária", manual_plan: null }, error: null },
          }),
        };
      },
    }),
  }),
}));
vi.mock("@/lib/profiles/resolve-profile-for-auth", () => ({
  linkProfileToAuthUser: async () => undefined,
  resolveProfileForAuthUser: async () => ({ profile: { id: "p1", agency_id: "ag1", ui_role: "agent", account_tier: "free", role: "agent" } }),
}));
vi.mock("@/lib/profiles/normalize-profile-entitlements", () => ({ normalizeProfileEntitlements: (p: unknown) => p }));
vi.mock("@/lib/license/resolve-account-tier", () => ({ resolveAccountTier: () => "free" }));
vi.mock("@/components/layout/AppSidebar", () => ({ default: () => null }));
vi.mock("@/components/layout/WorkdeskTopbar", () => ({ WorkdeskTopbar: () => null }));
vi.mock("@/components/auth/session-recovery", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({ redirect: () => undefined }));

import DashboardLayout from "../layout";

function Probe() {
  const catalog = usePricingV2Catalog();
  const agency = useAgencyPricingV2();
  return <i data-probe={JSON.stringify({ bands: catalog?.bands.length ?? null, agency })} />;
}

const render = async () => renderToStaticMarkup(await DashboardLayout({ children: <Probe /> }));

describe("(dashboard)/layout: cenník v2", () => {
  const prev = process.env.PRICING_V2_ENABLED;
  beforeEach(() => {
    h.selects.length = 0;
  });
  afterEach(() => {
    if (prev === undefined) delete process.env.PRICING_V2_ENABLED;
    else process.env.PRICING_V2_ENABLED = prev;
  });

  it("vypnutý prepínač: žiadny ďalší dotaz na agentúru a providery nesú null", async () => {
    delete process.env.PRICING_V2_ENABLED;
    const html = await render();
    expect(h.selects).toEqual(["name, manual_plan"]);
    expect(html).toContain("&quot;bands&quot;:null");
    expect(html).toContain("&quot;agency&quot;:null");
  });

  it("zapnutý prepínač + v2 agentúra: katalóg aj pásmo sa dostanú k potomkom", async () => {
    process.env.PRICING_V2_ENABLED = "true";
    const html = await render();
    expect(h.selects).toEqual(["name, manual_plan", "pricing_model, pricing_band"]);
    expect(html).toContain("&quot;bands&quot;:4");
    expect(html).toContain("&quot;bandId&quot;:&quot;team&quot;");
  });

  it("zapnutý prepínač + legacy agentúra (pricing_model NULL): agency null", async () => {
    process.env.PRICING_V2_ENABLED = "true";
    h.agencyRow = { pricing_model: null, pricing_band: null };
    const html = await render();
    h.agencyRow = { pricing_model: "v2", pricing_band: "team" };
    expect(html).toContain("&quot;bands&quot;:4");
    expect(html).toContain("&quot;agency&quot;:null");
  });
});
