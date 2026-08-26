import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profileMaybeSingle: vi.fn(),
  leadMaybeSingle: vi.fn(),
  createAdminClient: vi.fn(),
  analyzeCall: vi.fn(),
  persistCallAnalysisToCrm: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => mocks.getUser() },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => mocks.profileMaybeSingle(),
            }),
          }),
        };
      }
      if (table === "leads") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => mocks.leadMaybeSingle(),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
  createAdminClient: () => mocks.createAdminClient(),
}));

vi.mock("@/lib/ai/call-analysis", () => ({
  analyzeCall: (...args: unknown[]) => mocks.analyzeCall(...args),
}));

vi.mock("@/lib/workflows/call-analysis-persist", () => ({
  persistCallAnalysisToCrm: (...args: unknown[]) => mocks.persistCallAnalysisToCrm(...args),
}));

import { POST } from "../route";

const LEAD_ID = "22222222-2222-4222-8222-222222222222";
const ANALYSIS = {
  summary: "ok",
  nextAction: "call back",
  sentiment: "neutral",
  score: 60,
  keyTopics: [],
  buying_signals: [],
  objections: [],
  escalation_needed: false,
};

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/ai/call/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai/call/analyze tenant gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.analyzeCall.mockResolvedValue(ANALYSIS);
    mocks.profileMaybeSingle.mockResolvedValue({
      data: { agency_id: "agency-a" },
      error: null,
    });
    mocks.leadMaybeSingle.mockResolvedValue({
      data: { agency_id: "agency-a" },
      error: null,
    });
    mocks.createAdminClient.mockReturnValue({ admin: true });
    mocks.persistCallAnalysisToCrm.mockResolvedValue({
      activityId: "act-1",
      taskId: "task-1",
    });
  });

  it("analyzes without persist when persist_to_crm is false", async () => {
    const res = await POST(
      request({ transcript: "dlhý dostatočný prepis hovoru pre analýzu", persist_to_crm: false }),
    );

    expect(res.status).toBe(200);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.persistCallAnalysisToCrm).not.toHaveBeenCalled();
  });

  it("returns 403 when caller has no agency_id and persist is requested", async () => {
    mocks.profileMaybeSingle.mockResolvedValue({ data: { agency_id: null }, error: null });

    const res = await POST(
      request({
        transcript: "dlhý dostatočný prepis hovoru pre analýzu",
        lead_id: LEAD_ID,
        persist_to_crm: true,
      }),
    );

    expect(res.status).toBe(403);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.persistCallAnalysisToCrm).not.toHaveBeenCalled();
  });

  it("returns 403 when lead belongs to another agency", async () => {
    mocks.leadMaybeSingle.mockResolvedValue({
      data: { agency_id: "agency-b" },
      error: null,
    });

    const res = await POST(
      request({
        transcript: "dlhý dostatočný prepis hovoru pre analýzu",
        lead_id: LEAD_ID,
        persist_to_crm: true,
      }),
    );

    expect(res.status).toBe(403);
    expect(mocks.persistCallAnalysisToCrm).not.toHaveBeenCalled();
  });

  it("returns 403 when lead is not visible to the caller", async () => {
    mocks.leadMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await POST(
      request({
        transcript: "dlhý dostatočný prepis hovoru pre analýzu",
        lead_id: LEAD_ID,
        persist_to_crm: true,
      }),
    );

    expect(res.status).toBe(403);
    expect(mocks.persistCallAnalysisToCrm).not.toHaveBeenCalled();
  });

  it("persists when caller agency matches lead agency", async () => {
    const res = await POST(
      request({
        transcript: "dlhý dostatočný prepis hovoru pre analýzu",
        lead_id: LEAD_ID,
        persist_to_crm: true,
      }),
    );

    expect(res.status).toBe(200);
    expect(mocks.persistCallAnalysisToCrm).toHaveBeenCalledOnce();
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      persisted: { activity_id: "act-1", task_id: "task-1" },
    });
  });
});
