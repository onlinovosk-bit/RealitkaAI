import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tier 3 for REVOLIS-OUTREACH: sendAiOutreachEmail needs a human approval.
 * Without one (cron, automation script) nothing is generated and nothing sent,
 * whatever SCHEDULED_OUTREACH_ENABLED says.
 */

const mockResendSend = vi.hoisted(() => vi.fn());
const mockGenerate = vi.hoisted(() => vi.fn());
const mockLogAiAction = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockResendSend };
  },
}));
vi.mock("@/lib/ai-outreach", () => ({
  OUTREACH_PROMPT_VERSION: "outreach-v1",
  generateOutreachEmail: (...a: unknown[]) => mockGenerate(...a),
}));
vi.mock("@/lib/ai-action-audit", () => ({ logAiAction: (...a: unknown[]) => mockLogAiAction(...a) }));
vi.mock("@/lib/supabase/admin", () => ({ createServiceRoleClient: () => null }));
// Hermetic: CI runs a local Supabase, and the store's error path writes an
// activity — a real write there fails on RLS and masks the error under test.
const mockCreateActivity = vi.hoisted(() => vi.fn());
vi.mock("@/lib/activities-store", () => ({ createActivity: (...a: unknown[]) => mockCreateActivity(...a) }));
vi.mock("@/lib/usage-metrics", () => ({
  incrementUsageMetric: vi.fn().mockResolvedValue(undefined),
  SYSTEM_USAGE_AGENCY_ID: "system",
}));
vi.mock("@/lib/moat-capture/log-ai-recommendation", () => ({
  logAiRecommendation: vi.fn(),
  hashRecommendationDedupePart: () => "h",
}));
vi.mock("@/lib/outbound-orchestrator", () => ({
  fetchLeadAgencyId: async () => "agency-A",
  getHoursSinceLastAiEmailToLead: async () => null,
  outreachLeadCooldownHours: () => 48,
  pickOutboundAbVariant: () => "A",
}));
vi.mock("@/lib/leads-store", () => ({
  getLead: async () => ({ id: "lead-1", name: "Ján", email: "jan@example.com", status: "Ponuka" }),
  getLeadAsService: async () => undefined,
}));

import { sendAiOutreachEmail } from "../outreach-store";

describe("sendAiOutreachEmail — Control Contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("OUTREACH_FROM_EMAIL", "rk@example.com");
    vi.stubEnv("AGENT_KILL_SWITCH", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    mockCreateActivity.mockResolvedValue(undefined);
    mockLogAiAction.mockResolvedValue(undefined);
  });

  it("without an approval (cron/script): refuses before generating or sending, and audits the block", async () => {
    await expect(sendAiOutreachEmail("lead-1", {} as never, null)).rejects.toThrow(/schválenie/);

    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockResendSend).not.toHaveBeenCalled();
    const blocked = mockLogAiAction.mock.calls.find((c) => (c[0] as { meta?: { blocked?: boolean } }).meta?.blocked);
    expect(blocked?.[0]).toMatchObject({ actionKind: "send_failed", agencyId: "agency-A" });
  });

  it("kill switch blocks even an approved send", async () => {
    vi.stubEnv("AGENT_KILL_SWITCH", "1");
    await expect(
      sendAiOutreachEmail("lead-1", {} as never, {
        approvalId: "x", approvedBy: "makler@rk.sk", approvedAt: "2026-09-25T10:00:00.000Z",
      }),
    ).rejects.toThrow(/kill switch/);
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("with an approval: generates and sends", async () => {
    mockGenerate.mockResolvedValue({ subject: "S", body: "B", provider: "openai:gpt-4.1-mini", totalTokens: 10 });
    mockResendSend.mockResolvedValue({ id: "msg-1" });
    await sendAiOutreachEmail("lead-1", {} as never, {
      approvalId: "x", approvedBy: "makler@rk.sk", approvedAt: "2026-09-25T10:00:00.000Z",
    });
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockResendSend).toHaveBeenCalledTimes(1);
  });
});
