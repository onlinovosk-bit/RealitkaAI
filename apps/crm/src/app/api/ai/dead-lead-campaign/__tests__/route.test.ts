import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tier 3 for REVOLIS-DEAD-LEAD-CAMPAIGN: POST writes drafts only. The
 * prohibited behaviour is any outbound send, and texts that differ from what
 * the broker will approve.
 */

const mockSend = vi.hoisted(() => vi.fn());
const mockPlans = vi.hoisted(() => vi.fn());
const mockLogAiAction = vi.hoisted(() => vi.fn());
const inserts = vi.hoisted(() => ({ activities: [] as Record<string, unknown>[] }));
const state = vi.hoisted(() => ({ user: { id: "u-1" } as { id: string } | null, admin: true }));

const LEADS = [
  { id: "l-email", agency_id: "agency-A", name: "Ján", email: "jan@example.com", phone: "+421900000001", status: "DEAD" },
  { id: "l-sms", agency_id: "agency-A", name: "Eva", email: "eva@example.com", phone: "+421900000002", status: "DEAD" },
  { id: "l-none", agency_id: "agency-A", name: "Bez", email: "", phone: "", status: "DEAD" },
];

vi.mock("@/lib/multi-channel-sender", () => ({ sendMessage: (...a: unknown[]) => mockSend(...a) }));
vi.mock("@/lib/ai-action-audit", () => ({ logAiAction: (...a: unknown[]) => mockLogAiAction(...a) }));
vi.mock("@/lib/ai/rate-guard", () => ({ checkAiRateLimit: async () => null }));
vi.mock("@/lib/ai/dead-lead-campaign", () => ({
  DEAD_LEAD_PROMPT_VERSION: "dead-lead-v1",
  generateBatchReactivationPlan: (...a: unknown[]) => mockPlans(...a),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({ select: () => ({ in: async () => ({ data: LEADS, error: null }) }) }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () =>
    state.admin
      ? {
          from: () => ({
            insert: async (row: Record<string, unknown>) => {
              inserts.activities.push(row);
              return { error: null };
            },
          }),
        }
      : null,
}));

import { POST } from "../route";

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/ai/dead-lead-campaign", { method: "POST", body: JSON.stringify(body) }));

const plan = (id: string, channel: string, extra: Record<string, unknown> = {}) => ({
  lead: LEADS.find((l) => l.id === id),
  should_reactivate: true,
  reactivation_score: 70,
  reason: "nová ponuka",
  channel,
  message: `Správa pre ${id}`,
  subject: channel === "email" ? "Novinka" : undefined,
  cooldown_days: 30,
  ...extra,
});

describe("POST /api/ai/dead-lead-campaign — drafts only", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inserts.activities.length = 0;
    state.user = { id: "u-1" };
    state.admin = true;
    mockLogAiAction.mockResolvedValue(undefined);
    mockPlans.mockResolvedValue([
      plan("l-email", "email"),
      plan("l-sms", "sms"),
      plan("l-none", "email"),
      plan("l-email", "email", { should_reactivate: false }),
    ]);
  });

  it("never sends; creates one draft per reactivation plan", async () => {
    const json = await (await post({ lead_ids: ["l-email", "l-sms", "l-none"] })).json();
    expect(mockSend).not.toHaveBeenCalled();
    expect(json).toMatchObject({ ok: true, drafted: 3, sent: 0, no_contact: 1, skipped: 1 });
  });

  it("stores the exact text and the recipient matching the channel (email→email, sms→phone)", async () => {
    await post({ lead_ids: ["l-email", "l-sms", "l-none"] });
    const [email, sms, none] = inserts.activities.map((a) => a.meta as Record<string, unknown>);
    expect(email).toMatchObject({
      agent_id: "REVOLIS-DEAD-LEAD-CAMPAIGN", prompt_version: "dead-lead-v1",
      draft: true, requires_approval: true, channel: "email",
      body: "Správa pre l-email", subject: "Novinka", recipient: "jan@example.com",
    });
    // Old code sent `phone ?? email` regardless of channel; now the channel decides.
    expect(sms).toMatchObject({ channel: "sms", recipient: "+421900000002" });
    expect(none).not.toHaveProperty("recipient");
  });

  it("audits drafts as ai_suggested with the lead's agency", async () => {
    await post({ lead_ids: ["l-email"] });
    const kinds = mockLogAiAction.mock.calls.map((c) => (c[0] as { actionKind: string }).actionKind);
    expect(new Set(kinds)).toEqual(new Set(["ai_suggested"]));
    expect(mockLogAiAction.mock.calls[0][0]).toMatchObject({ agencyId: "agency-A" });
  });

  it("dry_run returns plans without writing anything", async () => {
    const json = await (await post({ lead_ids: ["l-email"], dry_run: true })).json();
    expect(json).toMatchObject({ ok: true, dry_run: true, would_draft: 3 });
    expect(inserts.activities).toHaveLength(0);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("requires a signed-in user", async () => {
    state.user = null;
    const res = await post({ lead_ids: ["l-email"] });
    expect(res.status).toBe(401);
    expect(mockPlans).not.toHaveBeenCalled();
  });

  it("returns 503 without a service-role client instead of silently dropping drafts", async () => {
    state.admin = false;
    const res = await post({ lead_ids: ["l-email"] });
    expect(res.status).toBe(503);
    expect(inserts.activities).toHaveLength(0);
  });
});
