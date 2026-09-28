import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * REVOLIS-INBOUND-AUTOREPLY on the live inbound paths (e-mail gateway, web
 * form). Tier 3: the helper may only write a draft for the broker to approve —
 * most cases assert what it must NOT do.
 */

const AGENCY_ID = "11111111-1111-1111-1111-111111111111";
const LEAD_ID = "lead-1";

const mockGenerate = vi.hoisted(() => vi.fn());
const mockLogAiAction = vi.hoisted(() => vi.fn());
const mockResendSend = vi.hoisted(() => vi.fn());

vi.mock("../auto-reply", () => ({
  AUTO_REPLY_PROMPT_VERSION: "inbound-autoreply-v1",
  generateAutoReply: (...a: unknown[]) => mockGenerate(...a),
}));
vi.mock("@/lib/ai-action-audit", () => ({ logAiAction: (...a: unknown[]) => mockLogAiAction(...a) }));
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: mockResendSend } })),
}));

import { draftInboundReply, draftInboundReplySafely, scheduleInboundReplyDraft } from "../reply-draft";

function admin(opts: { insertError?: { message: string } | null; insertThrows?: boolean } = {}) {
  const activities: Record<string, unknown>[] = [];
  const client = {
    from: (table: string) => {
      if (table !== "activities") throw new Error(`unexpected table ${table}`);
      return {
        insert: async (row: Record<string, unknown>) => {
          if (opts.insertThrows) throw new Error("db down");
          activities.push(row);
          return { error: opts.insertError ?? null };
        },
      };
    },
  };
  return { client: client as never, activities };
}

function input(db: ReturnType<typeof admin>, over: Record<string, unknown> = {}) {
  return {
    admin: db.client,
    leadId: LEAD_ID,
    agencyId: AGENCY_ID,
    profileId: "profile-1",
    agentName: "Maklér Test",
    lead: { name: "Ján Novák", email: "jan@example.com", message: "Chcem obhliadku", source: "portal:nehnutelnosti" },
    activitySource: "acquire_email",
    timeoutMs: 8000,
    skipOnFallback: true,
    ...over,
  };
}

describe("draftInboundReply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockGenerate.mockResolvedValue({ subject: "Obhliadka", body: "Dobrý deň, ozvem sa." });
    mockLogAiAction.mockResolvedValue(undefined);
  });

  it("stores an approvable draft with the exact text and recipient", async () => {
    const db = admin();
    const res = await draftInboundReply(input(db));

    expect(res.created).toBe(true);
    expect(db.activities).toHaveLength(1);
    const row = db.activities[0];
    expect(row).toMatchObject({ lead_id: LEAD_ID, source: "acquire_email", type: "AI návrh odpovede" });
    expect(row.meta).toMatchObject({
      draft: true,
      requires_approval: true,
      agent_id: "REVOLIS-INBOUND-AUTOREPLY",
      prompt_version: "inbound-autoreply-v1",
      channel: "email",
      subject: "Obhliadka",
      body: "Dobrý deň, ozvem sa.",
      recipient: "jan@example.com",
    });
    expect(res.created && res.activityId).toBe(row.id);
  });

  it("never sends anything", async () => {
    await draftInboundReply(input(admin()));
    expect(mockResendSend).not.toHaveBeenCalled();
    const kinds = mockLogAiAction.mock.calls.map((c) => (c[0] as { actionKind: string }).actionKind);
    expect(kinds).toEqual(["ai_suggested"]);
  });

  it("passes the lead's message and the caller's time budget to the LLM", async () => {
    await draftInboundReply(input(admin()));
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ leadName: "Ján Novák", message: "Chcem obhliadku", agentName: "Maklér Test" }),
      { timeoutMs: 8000 },
    );
  });

  it("skips a lead without e-mail — no LLM call, no draft", async () => {
    const db = admin();
    const res = await draftInboundReply(input(db, { lead: { name: "Bez mailu", email: "  " } }));
    expect(res).toEqual({ created: false, reason: "no_email" });
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(db.activities).toHaveLength(0);
  });

  it("does not store the fixed fallback text when skipOnFallback is set", async () => {
    mockGenerate.mockResolvedValue({ subject: "Ďakujeme", body: "fallback", fallback: true });
    const db = admin();
    const res = await draftInboundReply(input(db));
    expect(res).toEqual({ created: false, reason: "llm_fallback" });
    expect(db.activities).toHaveLength(0);
  });

  it("keeps the fallback draft when skipOnFallback is not set (webhook behaviour)", async () => {
    mockGenerate.mockResolvedValue({ subject: "Ďakujeme", body: "fallback", fallback: true });
    const db = admin();
    const res = await draftInboundReply(input(db, { skipOnFallback: undefined }));
    expect(res.created).toBe(true);
    expect(db.activities).toHaveLength(1);
  });

  it("reports insert_failed when the draft cannot be stored", async () => {
    const res = await draftInboundReply(input(admin({ insertError: { message: "boom" } })));
    expect(res).toEqual({ created: false, reason: "insert_failed" });
  });
});

describe("draftInboundReplySafely", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockGenerate.mockResolvedValue({ subject: "S", body: "B" });
  });

  it("kill switch stops the LLM call and the draft", async () => {
    vi.stubEnv("INBOUND_REPLY_DRAFT_DISABLED", "1");
    const db = admin();
    const res = await draftInboundReplySafely(input(db));
    expect(res).toEqual({ created: false, reason: "disabled" });
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(db.activities).toHaveLength(0);
  });

  it("never throws — the lead is already stored", async () => {
    mockGenerate.mockRejectedValue(new Error("llm exploded"));
    await expect(draftInboundReplySafely(input(admin()))).resolves.toEqual({
      created: false,
      reason: "error",
    });
    mockGenerate.mockResolvedValue({ subject: "S", body: "B" });
    await expect(draftInboundReplySafely(input(admin({ insertThrows: true })))).resolves.toMatchObject({
      created: false,
    });
  });
});

describe("scheduleInboundReplyDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockGenerate.mockResolvedValue({ subject: "S", body: "B" });
  });

  it("returns immediately and still writes the draft outside a request scope", async () => {
    const db = admin();
    expect(() => scheduleInboundReplyDraft(input(db))).not.toThrow();
    await vi.waitFor(() => expect(db.activities).toHaveLength(1));
  });

  it("never throws even when the draft fails", async () => {
    mockGenerate.mockRejectedValue(new Error("llm exploded"));
    const db = admin();
    expect(() => scheduleInboundReplyDraft(input(db))).not.toThrow();
    await vi.waitFor(() => expect(mockGenerate).toHaveBeenCalled());
    expect(db.activities).toHaveLength(0);
  });
});
