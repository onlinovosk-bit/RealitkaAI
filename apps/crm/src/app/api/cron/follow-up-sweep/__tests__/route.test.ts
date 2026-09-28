import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Tier 3 (Revolis System Spec §13): the nightly sweep writes drafts only.
 * The prohibited behaviour is any outbound send — including when the old
 * FOLLOWUP_MODE=send switch is still set in the environment.
 */

const mockSend = vi.hoisted(() => vi.fn());
const mockGenerate = vi.hoisted(() => vi.fn());
const mockLogAiAction = vi.hoisted(() => vi.fn());
const inserts = vi.hoisted(() => ({ activities: [] as Record<string, unknown>[] }));

vi.mock("@/lib/multi-channel-sender", () => ({ sendMessage: (...a: unknown[]) => mockSend(...a) }));
vi.mock("@/lib/ai-action-audit", () => ({ logAiAction: (...a: unknown[]) => mockLogAiAction(...a) }));
vi.mock("@/lib/ai/open-followup-generator", () => ({
  FOLLOWUP_PROMPT_VERSION: "open-followup-v1",
  generateOpenFollowUpsBatch: (...a: unknown[]) => mockGenerate(...a),
}));
vi.mock("@/lib/cron/follow-up-scoring", () => ({
  scoreFollowUp: (l: { id: string }) => ({ leadId: l.id, suggestedAction: "call", reason: "stale" }),
}));

const LEADS = [
  { id: "l1", agency_id: "agency-A", name: "Ján", email: "jan@example.com", phone: "", status: "Teplý", ai_followup_count: 0 },
  { id: "l2", agency_id: "agency-A", name: "Eva", email: "", phone: "+421900000000", status: "Nový", ai_followup_count: 0 },
  { id: "l3", agency_id: "agency-B", name: "Bez kontaktu", email: "", phone: "", status: "Nový", ai_followup_count: 0 },
];

vi.mock("@/lib/supabase/server", () => {
  const chain = (result: unknown) => {
    const c: Record<string, unknown> = {};
    for (const m of ["select", "in", "lt", "order", "eq", "update"]) c[m] = () => c;
    c.limit = async () => result;
    c.maybeSingle = async () => ({ data: { ai_followup_count: 0 }, error: null });
    c.then = (r: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(r);
    return c;
  };
  return {
    createAdminClient: () => ({
      from: (table: string) => {
        if (table === "activities") {
          return {
            insert: async (row: Record<string, unknown>) => {
              inserts.activities.push(row);
              return { error: null };
            },
          };
        }
        return chain({ data: LEADS, error: null });
      },
    }),
  };
});

import { GET } from "../route";

const call = () =>
  GET(new NextRequest("http://localhost/api/cron/follow-up-sweep", { headers: { authorization: "Bearer s" } }));

describe("GET /api/cron/follow-up-sweep — drafts only", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inserts.activities.length = 0;
    vi.stubEnv("CRON_SECRET", "s");
    mockLogAiAction.mockResolvedValue(undefined);
    mockGenerate.mockResolvedValue([
      { lead_id: "l1", should_contact: true, channel: "email", message: "Dobrý deň, ozývam sa.", subject: "Follow-up", broker_cc_needed: false, reason_sk: "stagnuje" },
      { lead_id: "l2", should_contact: true, channel: "sms", message: "Dobrý deň, SMS.", subject: "", broker_cc_needed: true, reason_sk: "stagnuje" },
      { lead_id: "l3", should_contact: true, channel: "email", message: "Bez adresy.", subject: "X", broker_cc_needed: false, reason_sk: "stagnuje" },
    ]);
  });

  it("never sends, even with FOLLOWUP_MODE=send, and reports the ignored mode", async () => {
    vi.stubEnv("FOLLOWUP_MODE", "send");
    const res = await call();
    const json = await res.json();

    expect(mockSend).not.toHaveBeenCalled();
    expect(json).toMatchObject({ ok: true, mode: "draft", requested_mode: "send", sent: 0, drafted: 3 });
  });

  it("stores approvable drafts with the exact text, channel and recipient", async () => {
    await call();
    const [email, sms, noAddr] = inserts.activities.map((a) => a.meta as Record<string, unknown>);

    expect(email).toMatchObject({
      draft: true, requires_approval: true, agent_id: "REVOLIS-FOLLOWUP-SWEEP",
      prompt_version: "open-followup-v1", channel: "email",
      subject: "Follow-up", body: "Dobrý deň, ozývam sa.", recipient: "jan@example.com",
    });
    expect(sms).toMatchObject({ channel: "sms", recipient: "+421900000000", body: "Dobrý deň, SMS." });
    // No address for the channel → no recipient → cannot be one-click sent.
    expect(noAddr).not.toHaveProperty("recipient");
  });

  it("audits every draft as ai_suggested with the lead's agency, never as sent", async () => {
    await call();
    const kinds = mockLogAiAction.mock.calls.map((c) => (c[0] as { actionKind: string }).actionKind);
    expect(kinds).toEqual(["ai_suggested", "ai_suggested", "ai_suggested"]);
    expect(mockLogAiAction.mock.calls[0][0]).toMatchObject({ agencyId: "agency-A", leadId: "l1" });
    expect(mockLogAiAction.mock.calls[2][0]).toMatchObject({ agencyId: "agency-B" });
  });

  it("skips plans the model marked should_contact=false", async () => {
    mockGenerate.mockResolvedValue([
      { lead_id: "l1", should_contact: false, channel: "email", message: "x", subject: "", broker_cc_needed: false, reason_sk: "" },
    ]);
    const json = await (await call()).json();
    expect(json.drafted).toBe(0);
    expect(inserts.activities).toHaveLength(0);
  });

  it("rejects calls without the cron secret", async () => {
    const res = await GET(new NextRequest("http://localhost/api/cron/follow-up-sweep"));
    expect(res.status).toBe(401);
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});
