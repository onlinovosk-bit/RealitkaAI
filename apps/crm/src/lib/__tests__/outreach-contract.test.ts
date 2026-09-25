import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tier 3 for REVOLIS-OUTREACH: the broker sees the exact text before it is sent.
 * - prepareOutreachDraft generates and stores a draft, never sends;
 * - sendApprovedOutreach (called only by approve-draft.ts) sends exactly the
 *   approved text, never regenerates;
 * - sendAiOutreachEmail (cron, automation script) is always refused before
 *   any text is generated, whatever SCHEDULED_OUTREACH_ENABLED says.
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
// ai_action_audit is where the daily limit and cooldown read sends from.
const audit = vi.hoisted(() => ({
  available: true,
  sentToday: 0 as number,
  lastSentAt: null as string | null,
  error: null as { message: string } | null,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => {
    if (!audit.available) return null;
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    for (const m of ["from", "eq", "gte", "order", "limit"]) chain[m] = self;
    chain.select = (_cols: string, opts?: { head?: boolean }) => {
      if (opts?.head) {
        const q: Record<string, unknown> = {};
        for (const m of ["eq", "gte"]) q[m] = () => q;
        q.then = (res: (v: unknown) => void) => res({ count: audit.sentToday, error: audit.error });
        return q;
      }
      return chain;
    };
    chain.maybeSingle = async () => ({
      data: audit.lastSentAt ? { created_at: audit.lastSentAt } : null,
      error: audit.error,
    });
    return chain;
  },
}));
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
  outreachLeadCooldownHours: () => 48,
  pickOutboundAbVariant: () => "A",
}));
vi.mock("@/lib/leads-store", () => ({
  getLead: async () => ({ id: "lead-1", name: "Ján", email: "jan@example.com", status: "Ponuka" }),
  getLeadAsService: async () => undefined,
}));

import { prepareOutreachDraft, sendAiOutreachEmail, sendApprovedOutreach } from "../outreach-store";

function fakeAdmin() {
  const inserts: Record<string, unknown>[] = [];
  const admin = {
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        inserts.push(row);
        return { error: null };
      },
    }),
  };
  return { admin: admin as never, inserts };
}

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
  Object.assign(audit, { available: true, sentToday: 0, lastSentAt: null, error: null });
  mockGenerate.mockResolvedValue({ subject: "S", body: "B", provider: "openai:gpt-4.1-mini", totalTokens: 10 });
  mockResendSend.mockResolvedValue({ data: { id: "re-1" }, error: null });
});

describe("sendAiOutreachEmail — no generate-and-send path", () => {
  it("refuses before generating or sending, and audits the block", async () => {
    await expect(sendAiOutreachEmail("lead-1", {} as never)).rejects.toThrow(/schválenie/);

    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockResendSend).not.toHaveBeenCalled();
    const blocked = mockLogAiAction.mock.calls.find((c) => (c[0] as { meta?: { blocked?: boolean } }).meta?.blocked);
    expect(blocked?.[0]).toMatchObject({ actionKind: "send_failed", agencyId: "agency-A" });
  });

  it("reports the kill switch when it is on", async () => {
    vi.stubEnv("AGENT_KILL_SWITCH", "1");
    await expect(sendAiOutreachEmail("lead-1", {} as never)).rejects.toThrow(/kill switch/);
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockResendSend).not.toHaveBeenCalled();
  });
});

describe("prepareOutreachDraft — step 1, nothing is sent", () => {
  it("stores the generated text as an approvable draft and returns it", async () => {
    const { admin, inserts } = fakeAdmin();
    const res = await prepareOutreachDraft({ leadId: "lead-1", scopedSupabase: {} as never, admin, profileId: "p-1" });

    expect(res).toMatchObject({ ok: true, to: "jan@example.com", subject: "S", body: "B" });
    expect(mockResendSend).not.toHaveBeenCalled();
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      id: (res as { activityId: string }).activityId,
      lead_id: "lead-1",
      source: "outreach",
      meta: {
        draft: true,
        requires_approval: true,
        agent_id: "REVOLIS-OUTREACH",
        prompt_version: "outreach-v1",
        channel: "email",
        subject: "S",
        body: "B",
        recipient: "jan@example.com",
      },
    });
    const suggested = mockLogAiAction.mock.calls.find((c) => (c[0] as { actionKind: string }).actionKind === "ai_suggested");
    expect(suggested?.[0]).toMatchObject({
      agencyId: "agency-A",
      variant: "A",
      meta: { approval_state: "pending_human", agent_id: "REVOLIS-OUTREACH" },
    });
  });

  it("per-lead cooldown stops it before any text is generated", async () => {
    audit.lastSentAt = new Date(Date.now() - 2 * 3_600_000).toISOString();
    const { admin, inserts } = fakeAdmin();
    const res = await prepareOutreachDraft({ leadId: "lead-1", scopedSupabase: {} as never, admin });
    expect(res).toMatchObject({ ok: false, status: 429 });
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(inserts).toHaveLength(0);
  });

  it("daily limit (counted from ai_action_audit sends) stops it before generation", async () => {
    audit.sentToday = 20;
    const { admin } = fakeAdmin();
    const res = await prepareOutreachDraft({ leadId: "lead-1", scopedSupabase: {} as never, admin });
    expect(res).toMatchObject({ ok: false, status: 429 });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("fails closed when the send history cannot be read (no silent 0)", async () => {
    audit.error = { message: 'relation "ai_action_audit" does not exist' };
    const { admin } = fakeAdmin();
    const res = await prepareOutreachDraft({ leadId: "lead-1", scopedSupabase: {} as never, admin });
    expect(res).toMatchObject({ ok: false, status: 503 });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("refuses without a sender address instead of drafting an e-mail that cannot go out", async () => {
    vi.stubEnv("OUTREACH_FROM_EMAIL", "");
    const { admin } = fakeAdmin();
    const res = await prepareOutreachDraft({ leadId: "lead-1", scopedSupabase: {} as never, admin });
    expect(res).toMatchObject({ ok: false, status: 503 });
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});

describe("sendApprovedOutreach — step 2, sends the approved text verbatim", () => {
  const approved = {
    leadId: "lead-1",
    to: "jan@example.com",
    channel: "email" as const,
    subject: "Schválený predmet",
    body: "Schválený text.",
    meta: { correlation_id: "corr-1" },
  };

  it("sends exactly the approved subject and body, never regenerates", async () => {
    const res = await sendApprovedOutreach(approved);
    expect(res).toEqual({ ok: true, channel: "email", to: "jan@example.com", messageId: "re-1" });
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockResendSend).toHaveBeenCalledWith(expect.objectContaining({
      from: "rk@example.com",
      to: "jan@example.com",
      subject: "Schválený predmet",
      text: "Schválený text.",
    }));
  });

  it("re-checks the cooldown at send time (another e-mail went out meanwhile)", async () => {
    audit.lastSentAt = new Date(Date.now() - 1 * 3_600_000).toISOString();
    const res = await sendApprovedOutreach(approved);
    expect(res).toMatchObject({ ok: false });
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("fails closed at send time without a service-role client", async () => {
    audit.available = false;
    const res = await sendApprovedOutreach(approved);
    expect(res).toMatchObject({ ok: false });
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("returns a failure (not success) when Resend rejects", async () => {
    mockResendSend.mockResolvedValue({ data: null, error: { message: "rate limited" } });
    const res = await sendApprovedOutreach(approved);
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/rate limited/) });
  });

  it("refuses a non-email channel", async () => {
    const res = await sendApprovedOutreach({ ...approved, channel: "sms" });
    expect(res.ok).toBe(false);
    expect(mockResendSend).not.toHaveBeenCalled();
  });
});
