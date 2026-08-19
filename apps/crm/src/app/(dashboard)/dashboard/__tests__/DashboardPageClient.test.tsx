import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("@/hooks/useSpaceInteractions", () => ({
  useCountUp: (value: number) => value,
}));

vi.mock("@/lib/workdesk/first-audit", () => ({
  buildFirstAudit: () => ({
    dataQuality: "ready",
    forgottenLeads: 0,
    atRiskDeals: 0,
    atRiskCommissionEur: null,
    commissionEstimateEur: null,
  }),
  formatAuditMoney: () => "?",
}));

vi.mock("@/lib/modules/registry", () => ({
  canRenderModule: () => false,
  normalizeModuleTier: () => "free",
}));

const listLeads = vi.fn();
vi.mock("@/lib/leads-store", () => ({
  LEADS_PAGE_SIZE: 50,
  listLeads: (...args: unknown[]) => listLeads(...args),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabaseClient: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: () => ({ select: () => ({ or: () => ({ maybeSingle: vi.fn() }) }) }),
  },
}));

vi.mock("@/components/dashboard/WorkdeskCommandHero", () => ({
  WorkdeskCommandHero: ({ leads }: { leads: Array<{ name: string }> }) => (
    <div>hero-{leads.map((lead) => lead.name).join(",")}</div>
  ),
}));

vi.mock("@/components/dashboard/priority-leads", () => ({ default: () => null }));
vi.mock("@/components/dashboard/AiInsightsPanel", () => ({ default: () => null }));
vi.mock("@/components/dashboard/properties-summary-widget", () => ({ default: () => null }));
vi.mock("@/components/dashboard/QuickActionsBar", () => ({ default: () => null }));
vi.mock("@/components/dashboard/recent-activity-feed", () => ({ default: () => null }));
vi.mock("@/components/dashboard/DailyActionPanel", () => ({ default: () => null }));
vi.mock("@/components/dashboard/TodaysTenLeads", () => ({ default: () => null }));
vi.mock("@/components/dashboard/AIAssistBanner", () => ({ AIAssistBanner: () => null }));
vi.mock("@/components/dashboard/AssistantPanel.dynamic", () => ({ AssistantPanelDynamic: () => null }));
vi.mock("@/components/dashboard/L99DecisionOpsPanel", () => ({ default: () => null }));
vi.mock("@/components/dashboard/FirstAuditPanel", () => ({ FirstAuditPanel: () => null }));
vi.mock("@/components/dashboard/ImportContactsBanner", () => ({ ImportContactsBanner: () => null }));
vi.mock("@/components/follow-up/FollowUpTodayCard", () => ({ FollowUpTodayCard: () => null }));
vi.mock("@/components/dashboard/ActionQueuePanel", () => ({ ActionQueuePanel: () => null }));

import DashboardPageClient from "../DashboardPageClient";

describe("DashboardPageClient parallel panels", () => {
  beforeEach(() => {
    listLeads.mockReset();
    listLeads.mockResolvedValue([
      {
        id: "lead-1",
        name: "Lead Alfa",
        status: "Hor?ci",
      },
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (String(url).includes("/api/forecasting/summary")) {
          return Promise.reject(new Error("forecast down"));
        }
        if (String(url).includes("/api/ai/monthly-forecast")) {
          return Promise.resolve(new Response(JSON.stringify({ ok: false }), { status: 500 }));
        }
        if (String(url).includes("/api/billing/plan")) {
          return Promise.resolve(new Response(JSON.stringify({ tier: "free", planKey: "free" }), { status: 200 }));
        }
        if (String(url).includes("/api/coaching/insight")) {
          return Promise.resolve(new Response(JSON.stringify({ ok: false }), { status: 500 }));
        }
        return Promise.reject(new Error(`unexpected fetch ${url}`));
      }),
    );
  });

  it("renders leads even when the forecast fetch rejects", async () => {
    render(<DashboardPageClient />);

    await waitFor(() => {
      expect(screen.getByText("hero-Lead Alfa")).toBeInTheDocument();
    });
    expect(screen.queryByText("Na??tavam preh?ad?")).not.toBeInTheDocument();
  });
});
