import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());
const getCurrentProfileMock = vi.hoisted(() => vi.fn());
const listLeadsMock = vi.hoisted(() => vi.fn());
const listTasksMock = vi.hoisted(() => vi.fn());
const incrementUsageMetricMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentProfile: (...args: unknown[]) => getCurrentProfileMock(...args),
}));

vi.mock("@/lib/leads-store", () => ({
  listLeads: (...args: unknown[]) => listLeadsMock(...args),
}));

vi.mock("@/lib/tasks-store", () => ({
  listTasks: (...args: unknown[]) => listTasksMock(...args),
}));

vi.mock("@/lib/usage-metrics", () => ({
  incrementUsageMetric: (...args: unknown[]) => incrementUsageMetricMock(...args),
}));

const AGENCY = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";

function post(body: unknown, raw?: string) {
  return new Request("http://localhost/api/ai/smolko-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
}

describe("POST /api/ai/smolko-chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: { getUser: (...a: unknown[]) => getUserMock(...a) },
    });
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    getCurrentProfileMock.mockResolvedValue({ id: "profile-1", agency_id: AGENCY });
    listLeadsMock.mockResolvedValue([]);
    listTasksMock.mockResolvedValue([]);
    incrementUsageMetricMock.mockResolvedValue(undefined);
  });

  it("401 bez prihláseného usera", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { POST } = await import("../route");
    const res = await POST(post({ question: "Komu mám volať dnes?" }));

    expect(res.status).toBe(401);
    expect(listLeadsMock).not.toHaveBeenCalled();
    expect(listTasksMock).not.toHaveBeenCalled();
  });

  it("403 keď profil nemá agency_id", async () => {
    getCurrentProfileMock.mockResolvedValue({ id: "profile-1", agency_id: null });

    const { POST } = await import("../route");
    const res = await POST(post({ question: "Komu mám volať dnes?" }));

    expect(res.status).toBe(403);
    expect(listLeadsMock).not.toHaveBeenCalled();
    expect(listTasksMock).not.toHaveBeenCalled();
  });

  it("403 keď profil vôbec neexistuje", async () => {
    getCurrentProfileMock.mockResolvedValue(null);

    const { POST } = await import("../route");
    const res = await POST(post({ question: "Komu mám volať dnes?" }));

    expect(res.status).toBe(403);
  });

  it("400 pri otázke kratšej ako 3 znaky", async () => {
    const { POST } = await import("../route");
    const res = await POST(post({ question: "ok" }));

    expect(res.status).toBe(400);
    expect(listLeadsMock).not.toHaveBeenCalled();
  });

  it("400 pri otázke dlhšej ako 280 znakov", async () => {
    const { POST } = await import("../route");
    const res = await POST(post({ question: "a".repeat(281) }));

    expect(res.status).toBe(400);
    expect(listLeadsMock).not.toHaveBeenCalled();
  });

  it("400 pri chýbajúcom poli question", async () => {
    const { POST } = await import("../route");
    const res = await POST(post({}));

    expect(res.status).toBe(400);
  });

  it("400 pri nevalidnom JSON tele", async () => {
    const { POST } = await import("../route");
    const res = await POST(post(null, "{ not json"));

    expect(res.status).toBe(400);
    expect(listLeadsMock).not.toHaveBeenCalled();
  });

  it("200 pri validnom vstupe — odpoveď je postavená na tenant-scoped dátach", async () => {
    listTasksMock.mockResolvedValue([
      {
        id: "task-1",
        leadId: "lead-1",
        assignedProfileId: null,
        title: "Zavolať Lucii",
        description: "",
        status: "open",
        priority: "high",
        dueAt: null,
        completedAt: null,
      },
    ]);

    const { POST } = await import("../route");
    const res = await POST(post({ question: "Čo mám vybaviť ako prvé?" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.answer).toBeDefined();
    expect(typeof body.answer.answer).toBe("string");

    // listTasks/listLeads musia dostať scoped klienta (RLS + tenant scope).
    const scopedClient = await createClientMock.mock.results[0].value;
    expect(listTasksMock).toHaveBeenCalledWith(scopedClient);
    expect(listLeadsMock).toHaveBeenCalledWith(undefined, scopedClient, { limit: 200 });

    expect(incrementUsageMetricMock).toHaveBeenCalledWith({
      agencyId: AGENCY,
      metric: "ai_chatbot_queries",
    });
  });

  it("presne 3 znaky prejdú (hranica dĺžky)", async () => {
    const { POST } = await import("../route");
    const res = await POST(post({ question: "kto" }));

    expect(res.status).toBe(200);
  });

  it("presne 280 znakov prejde (horná hranica)", async () => {
    const { POST } = await import("../route");
    const res = await POST(post({ question: "a".repeat(280) }));

    expect(res.status).toBe(200);
  });
});
