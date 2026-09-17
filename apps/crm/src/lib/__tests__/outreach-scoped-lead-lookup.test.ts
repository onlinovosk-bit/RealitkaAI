import { beforeEach, describe, expect, it, vi } from "vitest";

const getLeadMock = vi.fn();
const getLeadAsServiceMock = vi.fn();
const createServiceRoleClientMock = vi.fn();

vi.mock("@/lib/leads-store", () => ({
  getLead: (...args: unknown[]) => getLeadMock(...args),
  getLeadAsService: (...args: unknown[]) => getLeadAsServiceMock(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => createServiceRoleClientMock(),
}));

// The remaining outreach-store imports are only needed so the module loads.
vi.mock("resend", () => ({ Resend: class {} }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => null }));
vi.mock("@/lib/ai-action-audit", () => ({ logAiAction: vi.fn() }));
vi.mock("@/lib/ai-outreach", () => ({ generateOutreachEmail: vi.fn() }));
vi.mock("@/lib/ai/llm-usage-cost", () => ({
  estimateOpenAiCostFromTotalTokens: () => 0,
}));
vi.mock("@/lib/program-tier-pricing", () => ({
  CREDIT_ACTION_COSTS: { aiEmail: 1 },
}));
vi.mock("@/lib/activities-store", () => ({ createActivity: vi.fn() }));
vi.mock("@/lib/outbound-orchestrator", () => ({
  fetchLeadAgencyId: vi.fn(),
  getHoursSinceLastAiEmailToLead: vi.fn(),
  outreachLeadCooldownHours: () => 24,
  pickOutboundAbVariant: () => "a",
}));
vi.mock("@/lib/usage-metrics", () => ({
  incrementUsageMetric: vi.fn(),
  SYSTEM_USAGE_AGENCY_ID: "system",
}));
vi.mock("@/lib/moat-capture/log-ai-recommendation", () => ({
  logAiRecommendation: vi.fn(),
  hashRecommendationDedupePart: () => "hash",
}));
vi.mock("@/lib/auto-error-capture", () => ({ autoErrorCapture: vi.fn() }));

const SCOPED = { marker: "scoped-client" } as never;
const SERVICE = { marker: "service-client" } as never;
const LEAD = { id: "lead-1", name: "Jana", email: "jana@example.sk" };

describe("resolveOutreachLead — explicit client instead of the browser singleton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the request-scoped client when the caller has a session (RLS path)", async () => {
    getLeadMock.mockResolvedValue(LEAD);
    const { resolveOutreachLead } = await import("@/lib/outreach-store");

    const lead = await resolveOutreachLead("lead-1", SCOPED);

    expect(lead).toEqual(LEAD);
    expect(getLeadMock).toHaveBeenCalledWith("lead-1", SCOPED);
    expect(getLeadAsServiceMock).not.toHaveBeenCalled();
    expect(createServiceRoleClientMock).not.toHaveBeenCalled();
  });

  it("falls back to the service-role reader for cron (no session)", async () => {
    createServiceRoleClientMock.mockReturnValue(SERVICE);
    getLeadAsServiceMock.mockResolvedValue(LEAD);
    const { resolveOutreachLead } = await import("@/lib/outreach-store");

    const lead = await resolveOutreachLead("lead-1");

    expect(lead).toEqual(LEAD);
    expect(getLeadAsServiceMock).toHaveBeenCalledWith(SERVICE, "lead-1");
    expect(getLeadMock).not.toHaveBeenCalled();
  });

  it("fails closed when no session and no service-role key (never a silent miss)", async () => {
    createServiceRoleClientMock.mockReturnValue(null);
    const { resolveOutreachLead } = await import("@/lib/outreach-store");

    await expect(resolveOutreachLead("lead-1")).rejects.toThrow(
      /SUPABASE_SERVICE_ROLE_KEY/,
    );
    expect(getLeadMock).not.toHaveBeenCalled();
  });

  it("returns undefined (not a mock lead) when the scoped read finds nothing", async () => {
    getLeadMock.mockResolvedValue(undefined);
    const { resolveOutreachLead } = await import("@/lib/outreach-store");

    await expect(resolveOutreachLead("missing", SCOPED)).resolves.toBeUndefined();
  });
});
