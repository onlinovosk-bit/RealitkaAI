import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/outreach/{send,approve}: only an approved draft (from /api/outreach/preview)
 * can be sent. No draft id → nothing is generated, nothing is sent.
 */

const mockApprove = vi.hoisted(() => vi.fn());
vi.mock("@/lib/inbound/approve-draft", () => ({ approveAndSendInboundDraft: (...a: unknown[]) => mockApprove(...a) }));
vi.mock("@/lib/auth", () => ({
  getCurrentProfile: async () => ({ id: "p-1", agency_id: "agency-A", email: "makler@rk.sk", auth_user_id: "u-1" }),
}));
vi.mock("@/lib/feature-gating", () => ({ requireFeature: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => ({ allowed: true }) }));
vi.mock("@/lib/supabase/admin", () => ({ createServiceRoleClient: () => ({}) }));
vi.mock("@/lib/usage-metrics", () => ({ incrementUsageMetric: vi.fn().mockResolvedValue(undefined) }));

import { POST as send } from "../route";
import { POST as approve } from "../../approve/route";

const req = (body: unknown) =>
  new Request("http://localhost/api/outreach/send", { method: "POST", body: JSON.stringify(body) });

describe.each([
  ["send", send],
  ["approve", approve],
])("POST /api/outreach/%s", (_name, POST) => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApprove.mockResolvedValue({ ok: true, messageId: "re-1" });
  });

  it("refuses without a draft id — no blind generate-and-send", async () => {
    const res = await POST(req({ leadId: "lead-1" }));
    expect(res.status).toBe(400);
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it("sends only the outreach draft through the shared approve path", async () => {
    const res = await POST(req({ leadId: "lead-1", activityId: "act-1" }));
    expect(res.status).toBe(200);
    expect(mockApprove).toHaveBeenCalledWith(expect.objectContaining({
      leadId: "lead-1",
      activityId: "act-1",
      expectAgentId: "REVOLIS-OUTREACH",
      approver: expect.objectContaining({ profileId: "p-1", agencyId: "agency-A" }),
    }));
  });

  it("passes the approve path's refusal through (e.g. kill switch 503)", async () => {
    mockApprove.mockResolvedValue({ ok: false, status: 503, error: "kill switch" });
    const res = await POST(req({ leadId: "lead-1", activityId: "act-1" }));
    expect(res.status).toBe(503);
  });
});
