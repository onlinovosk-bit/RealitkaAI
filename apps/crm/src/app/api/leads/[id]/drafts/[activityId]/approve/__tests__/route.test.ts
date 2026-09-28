import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProfile = vi.hoisted(() => vi.fn());
const mockApprove = vi.hoisted(() => vi.fn());
const mockRate = vi.hoisted(() => vi.fn());
const mockAdmin = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ getCurrentProfile: () => mockProfile() }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: (...a: unknown[]) => mockRate(...a) }));
vi.mock("@/lib/usage-metrics", () => ({ incrementUsageMetric: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/supabase/admin", () => ({ createServiceRoleClient: () => mockAdmin() }));
vi.mock("@/lib/inbound/approve-draft", () => ({
  approveAndSendInboundDraft: (...a: unknown[]) => mockApprove(...a),
}));

import { POST } from "../route";

const params = Promise.resolve({ id: "lead-1", activityId: "act-1" });
const call = () => POST(new Request("http://localhost/x", { method: "POST" }), { params });

describe("POST /api/leads/:id/drafts/:activityId/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfile.mockResolvedValue({
      id: "p-1", agency_id: "agency-A", auth_user_id: "u-1", email: "makler@rk.sk", full_name: "M",
    });
    mockRate.mockResolvedValue({ allowed: true, remaining: 9 });
    mockAdmin.mockReturnValue({});
    mockApprove.mockResolvedValue({ ok: true, messageId: "m-1" });
  });

  it("requires a signed-in broker and never reaches the sender otherwise", async () => {
    mockProfile.mockResolvedValue(null);
    const res = await call();
    expect(res.status).toBe(401);
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it("is rate limited", async () => {
    mockRate.mockResolvedValue({ allowed: false, remaining: 0 });
    const res = await call();
    expect(res.status).toBe(429);
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it("passes the caller's own agency as the approver — never one from the request", async () => {
    await call();
    expect(mockApprove.mock.calls[0][0]).toMatchObject({
      leadId: "lead-1",
      activityId: "act-1",
      approver: { profileId: "p-1", agencyId: "agency-A", label: "makler@rk.sk" },
    });
  });

  it("maps a refusal to its status", async () => {
    mockApprove.mockResolvedValue({ ok: false, status: 409, error: "Návrh už bol odoslaný." });
    const res = await call();
    expect(res.status).toBe(409);
  });
});
