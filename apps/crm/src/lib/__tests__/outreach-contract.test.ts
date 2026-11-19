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
// Agency id must be a real UUID: the unsubscribe token only signs UUID scopes.
const AGENCY = vi.hoisted(() => "11111111-1111-4111-8111-111111111111");

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
  suppressed: false,
  suppressionError: null as { message: string } | null,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => {
    if (!audit.available) return null;
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    for (const m of ["eq", "gte", "order", "limit"]) chain[m] = self;
    // email_suppressions lookup: from().select().eq().in().limit() is awaited.
    const supp: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "limit"]) supp[m] = () => supp;
    supp.then = (res: (v: unknown) => void) =>
      res({
        data: audit.suppressed ? [{ reason: "unsubscribe" }] : [],
        error: audit.suppressionError,
      });
    chain.from = (table: string) => (table === "email_suppressions" ? supp : chain);
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
const fetchLeadAgencyIdMock = vi.hoisted(() => vi.fn(async () => AGENCY as string | null));
vi.mock("@/lib/outbound-orchestrator", () => ({
  fetchLeadAgencyId: (...a: unknown[]) => fetchLeadAgencyIdMock(...a),
  outreachLeadCooldownHours: () => 48,
  pickOutboundAbVariant: () => "A",
}));
vi.mock("@/lib/leads-store", () => ({
  getLead: async () => ({ id: "lead-1", name: "Ján", email: "jan@example.com", status: "Ponuka" }),
  getLeadAsService: async () => undefined,
}));

import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { hashEmail } from "@/lib/email/suppression";
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
  vi.stubEnv("UNSUBSCRIBE_TOKEN_SECRET", "test-unsubscribe-secret-0123456789abcdef");
  vi.stubEnv("AGENT_KILL_SWITCH", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  mockCreateActivity.mockResolvedValue(undefined);
  mockLogAiAction.mockResolvedValue(undefined);
  Object.assign(audit, { available: true, sentToday: 0, lastSentAt: null, error: null, suppressed: false, suppressionError: null });
  fetchLeadAgencyIdMock.mockReset();
  fetchLeadAgencyIdMock.mockResolvedValue(AGENCY);
  mockGenerate.mockResolvedValue({ subject: "S", body: "B", provider: "openai:gpt-4.1-mini", totalTokens: 10 });
  mockResendSend.mockResolvedValue({ data: { id: "re-1" }, error: null });
});

describe("sendAiOutreachEmail — no generate-and-send path", () => {
  it("refuses before generating or sending, and audits the block", async () => {
    await expect(sendAiOutreachEmail("lead-1", {} as never)).rejects.toThrow(/schválenie/);

    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockResendSend).not.toHaveBeenCalled();
    const blocked = mockLogAiAction.mock.calls.find((c) => (c[0] as { meta?: { blocked?: boolean } }).meta?.blocked);
    expect(blocked?.[0]).toMatchObject({ actionKind: "send_failed", agencyId: AGENCY });
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
      agencyId: AGENCY,
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

  it("fails closed when lead agency cannot be resolved (no SYSTEM_USAGE fallback)", async () => {
    fetchLeadAgencyIdMock.mockResolvedValueOnce(null);
    const { admin, inserts } = fakeAdmin();
    const res = await prepareOutreachDraft({ leadId: "lead-1", scopedSupabase: {} as never, admin });
    expect(res).toMatchObject({ ok: false, status: 503, error: expect.stringMatching(/Agentúra leadu/) });
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(inserts).toHaveLength(0);
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
      text: expect.stringMatching(/^Schválený text\.\n\n--\n/),
    }));
  });

  it("adds a signed List-Unsubscribe header (RFC 8058 one-click) and a footer link", async () => {
    await sendApprovedOutreach(approved);
    const sent = mockResendSend.mock.calls[0][0] as { text: string; headers: Record<string, string> };
    const url = /<(https:\/\/[^>]+\/api\/unsubscribe\?t=[^>]+)>/.exec(sent.headers["List-Unsubscribe"])?.[1];
    expect(url).toBeTruthy();
    expect(sent.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(sent.text).toContain(url!);
    // the token carries the address hash and the agency, never the address itself
    const payload = verifyUnsubscribeToken(new URL(url!).searchParams.get("t"));
    expect(payload).toEqual({ t: "o", h: hashEmail("jan@example.com"), a: AGENCY });
    expect(url).not.toContain("jan");
  });

  it("does not send to a suppressed address", async () => {
    audit.suppressed = true;
    const res = await sendApprovedOutreach(approved);
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/odhlásených/) });
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("fails closed when lead agency cannot be resolved (no SYSTEM_USAGE fallback)", async () => {
    fetchLeadAgencyIdMock.mockResolvedValueOnce(null);
    const res = await sendApprovedOutreach(approved);
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/Agentúra leadu/) });
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("fails closed when the suppression list cannot be read", async () => {
    audit.suppressionError = { message: 'relation "email_suppressions" does not exist' };
    const res = await sendApprovedOutreach(approved);
    expect(res).toMatchObject({ ok: false });
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("does not send without UNSUBSCRIBE_TOKEN_SECRET", async () => {
    vi.stubEnv("UNSUBSCRIBE_TOKEN_SECRET", "");
    const res = await sendApprovedOutreach(approved);
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/UNSUBSCRIBE_TOKEN_SECRET/) });
    expect(mockResendSend).not.toHaveBeenCalled();
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
