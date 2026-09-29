import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  getAssistantAnswer: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/assistant-chat", () => ({
  getAssistantAnswer: mocks.getAssistantAnswer,
}));

const USER = { id: "auth-user-1" };
const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002";

function supabaseWith(rows: Record<string, unknown>) {
  return {
    auth: { getUser: mocks.getUser },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: rows[table] ?? null }) }),
      }),
    }),
  };
}

function postRequest() {
  return new Request("http://localhost/api/leads/lead-1/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "Daj mi kontakt na tohto kupujuceho." }),
  });
}

const params = Promise.resolve({ id: "lead-1" });

describe("POST /api/leads/[id]/assistant — tenant brana", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: USER } });
    mocks.getAssistantAnswer.mockResolvedValue({ ok: true, answer: "odpoved" });
  });

  it("volajuci BEZ agentury sa nedostane k asistentovi nad ziadnym leadom", async () => {
    mocks.createClient.mockResolvedValue(
      supabaseWith({ profiles: { agency_id: null }, leads: { agency_id: AGENCY_B } }),
    );

    const res = await POST(postRequest(), { params });

    expect(res.status).toBe(403);
    expect(mocks.getAssistantAnswer).not.toHaveBeenCalled();
  });

  it("volajuci bez profiloveho riadku sa nedostane k asistentovi", async () => {
    mocks.createClient.mockResolvedValue(
      supabaseWith({ profiles: null, leads: { agency_id: AGENCY_B } }),
    );

    const res = await POST(postRequest(), { params });

    expect(res.status).toBe(403);
    expect(mocks.getAssistantAnswer).not.toHaveBeenCalled();
  });

  it("volajuci s agenturou sa stale nedostane k cudziemu leadu", async () => {
    mocks.createClient.mockResolvedValue(
      supabaseWith({ profiles: { agency_id: AGENCY_A }, leads: { agency_id: AGENCY_B } }),
    );

    const res = await POST(postRequest(), { params });

    expect(res.status).toBe(403);
    expect(mocks.getAssistantAnswer).not.toHaveBeenCalled();
  });

  it("volajuci sa dostane k asistentovi nad vlastnym leadom", async () => {
    mocks.createClient.mockResolvedValue(
      supabaseWith({ profiles: { agency_id: AGENCY_A }, leads: { agency_id: AGENCY_A } }),
    );

    const res = await POST(postRequest(), { params });

    expect(res.status).toBe(200);
    expect(mocks.getAssistantAnswer).toHaveBeenCalledTimes(1);
  });
});
