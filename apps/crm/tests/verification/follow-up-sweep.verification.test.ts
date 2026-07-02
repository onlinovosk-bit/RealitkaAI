import { beforeEach, describe, expect, it, vi } from "vitest";
import { isCriticalFollowUp, scoreFollowUp } from "@/lib/cron/follow-up-scoring";

vi.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    headers: Headers;
    constructor(_url: string, init?: { headers?: Record<string, string> }) {
      this.headers = new Headers(init?.headers);
    }
  },
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const generateBatchMock = vi.fn();
const sendMessageMock = vi.fn();
const leadUpdates: Record<string, unknown>[] = [];
const activityInserts: Record<string, unknown>[] = [];
const followupMeta: Record<string, { ai_followup_count: number; last_ai_followup_at?: string }> = {
  "l-draft": { ai_followup_count: 0 },
};

function mockLeadsChain() {
  const applyLeadUpdate = (id: string, row: Record<string, unknown>) => {
    followupMeta[id] = {
      ai_followup_count: Number(row.ai_followup_count ?? followupMeta[id]?.ai_followup_count ?? 0),
      last_ai_followup_at: String(row.last_ai_followup_at ?? followupMeta[id]?.last_ai_followup_at ?? ""),
    };
    leadUpdates.push({ id, ...row });
  };

  const listQuery = {
    in: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: [
        {
          id: "l-draft",
          name: "Peter K.",
          email: "peter@rk.sk",
          phone: "+421900000001",
          status: "Teplý",
          budget: "150000",
          location: "Prešov",
          last_contact: "2026-05-01",
          note: "",
          score: 55,
          updated_at: "2026-05-01T08:00:00Z",
          last_ai_followup_at: null,
          ai_followup_count: 0,
          ai_priority: "Stredná",
        },
      ],
      error: null,
    }),
  };

  return {
    select: vi.fn().mockImplementation((cols?: string) => {
      if (cols === "ai_followup_count") {
        return {
          eq: vi.fn().mockImplementation((_col: string, id: string) => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: followupMeta[id] ?? { ai_followup_count: 0 },
              error: null,
            }),
          })),
        };
      }
      return listQuery;
    }),
    update: vi.fn().mockImplementation((row: Record<string, unknown>) => ({
      eq: vi.fn().mockImplementation((_col: string, id: string) => {
        applyLeadUpdate(id, row);
        return Promise.resolve({ error: null });
      }),
    })),
    insert: vi.fn().mockImplementation((row: Record<string, unknown>) => {
      activityInserts.push(row);
      return Promise.resolve({ error: null });
    }),
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "leads") return mockLeadsChain();
      if (table === "activities") {
        return {
          insert: vi.fn().mockImplementation((row: Record<string, unknown>) => {
            activityInserts.push(row);
            return Promise.resolve({ error: null });
          }),
        };
      }
      return mockLeadsChain();
    },
  }),
}));

vi.mock("@/lib/ai/open-followup-generator", () => ({
  generateOpenFollowUpsBatch: (...args: unknown[]) => generateBatchMock(...args),
}));

vi.mock("@/lib/multi-channel-sender", () => ({
  sendMessage: (...args: unknown[]) => sendMessageMock(...args),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/follow-up-sweep/route";

describe("[verification] Follow-up sweep scoring", () => {
  it("flags critical urgency after 14+ days without contact", () => {
    const past = new Date(Date.now() - 15 * 86_400_000).toISOString();
    const action = scoreFollowUp({
      id: "l-1",
      name: "Peter K.",
      last_contact: past,
      ai_priority: "Stredná",
    });
    expect(action.urgency).toBe("critical");
    expect(isCriticalFollowUp({ id: "l-1", last_contact: past })).toBe(true);
  });

  it("suggests HOT call for Vysoká priority", () => {
    const recent = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const action = scoreFollowUp({
      id: "l-2",
      name: "Anna M.",
      last_contact: recent,
      ai_priority: "Vysoká",
    });
    expect(action.suggestedAction).toContain("HOT");
    expect(action.urgency).toBe("normal");
  });

  it("treats never-contacted leads as max staleness", () => {
    const action = scoreFollowUp({
      id: "l-3",
      name: "Nový",
      last_contact: "Bez kontaktu",
      ai_priority: "Nízka",
    });
    expect(action.daysSinceContact).toBe(999);
    expect(action.reason).toContain("Nikdy");
  });
});

describe("[verification] Follow-up sweep cron FOLLOWUP_MODE=draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leadUpdates.length = 0;
    activityInserts.length = 0;
    followupMeta["l-draft"] = { ai_followup_count: 0 };
    vi.stubEnv("CRON_SECRET", "cron-test-secret");
    vi.stubEnv("FOLLOWUP_MODE", "draft");
    generateBatchMock.mockResolvedValue([
      {
        lead_id: "l-draft",
        should_contact: true,
        message: "Dobrý deň, volám ohľadom vašej nehnuteľnosti.",
        reason_sk: "Stagnácia 14+ dní",
        channel: "email",
        subject: "Follow-up",
        broker_cc_needed: false,
      },
    ]);
    sendMessageMock.mockResolvedValue({ ok: true, messageId: "msg-1" });
  });

  it("draft mode inserts activity draft and bumps ai_followup_count without send", async () => {
    const req = new NextRequest("http://localhost/api/cron/follow-up-sweep", {
      headers: { authorization: "Bearer cron-test-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.mode).toBe("draft");
    expect(body.drafted).toBe(1);
    expect(body.sent).toBe(0);
    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(activityInserts.some((a) => a.meta && (a.meta as { draft?: boolean }).draft === true)).toBe(true);
    expect(followupMeta["l-draft"]?.ai_followup_count).toBe(1);
    expect(followupMeta["l-draft"]?.last_ai_followup_at).toBeTruthy();
  });
});
