import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * TENANT-GATE-2: osem miest s tvarom `if (callerProfile?.agency_id) { … }`
 * (profil bez agentúry blok preskočil) + dve route bez tenant kontroly.
 * Test beží cez skutočné route handlery a stráži DÔSLEDOK: store sa pri cudzom
 * alebo bezagentúrnom volajúcom NEZAVOLÁ.
 */
const m = vi.hoisted(() => ({
  profile: vi.fn(),
  lead: vi.fn(),
  taskRow: vi.fn(),
  scoped: { marker: "scoped" } as Record<string, unknown>,
  getActivitiesByLeadId: vi.fn(),
  createActivity: vi.fn(),
  getLead: vi.fn(),
  getPipelineMovesByLeadId: vi.fn(),
  appendPipelineMove: vi.fn(),
  deleteTask: vi.fn(),
  updateTask: vi.fn(),
  generateDealStrategy: vi.fn(),
  analyzeSalesBrain: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    Object.assign(m.scoped, {
      auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () =>
              table === "profiles" ? m.profile() : table === "tasks" ? m.taskRow() : m.lead(),
            single: async () => m.lead(),
          }),
        }),
      }),
    }),
  createAdminClient: () => ({}),
}));
vi.mock("@/lib/auth", () => ({ getCurrentProfile: async () => ({ id: "p1", fullName: "A" }) }));
vi.mock("@/lib/google-calendar-server", () => ({ tryCreateReminderFromNote: async () => ({ kind: "skipped" }) }));
vi.mock("@/lib/rescore-lead", () => ({ rescoreLead: async () => undefined }));
vi.mock("@/lib/activities-store", () => ({ createActivity: (...a: unknown[]) => m.createActivity(...a) }));
vi.mock("@/lib/tasks-store", () => ({
  deleteTask: (...a: unknown[]) => m.deleteTask(...a),
  updateTask: (...a: unknown[]) => m.updateTask(...a),
}));
vi.mock("@/lib/leads-store", async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return {
    ...actual,
    getActivitiesByLeadId: (...a: unknown[]) => m.getActivitiesByLeadId(...a),
    getLead: (...a: unknown[]) => m.getLead(...a),
    getPipelineMovesByLeadId: (...a: unknown[]) => m.getPipelineMovesByLeadId(...a),
    appendPipelineMove: (...a: unknown[]) => m.appendPipelineMove(...a),
  };
});
vi.mock("@/lib/ai/deal-strategy", () => ({ generateDealStrategy: (...a: unknown[]) => m.generateDealStrategy(...a) }));
vi.mock("@/lib/ai/sales-brain", () => ({ analyzeSalesBrain: (...a: unknown[]) => m.analyzeSalesBrain(...a) }));

const ID = "33333333-3333-4333-8333-333333333333";
const params = () => ({ params: Promise.resolve({ id: ID }) });
const req = (method = "GET", body?: unknown) =>
  new Request("http://x", { method, body: body ? JSON.stringify(body) : undefined });

type Case = { name: string; run: () => Promise<Response>; stores: () => unknown[] };

async function cases(): Promise<Case[]> {
  const act = await import("../activities/route");
  const mov = await import("../moves/route");
  const lead = await import("../route");
  const tasks = await import("../../../tasks/[id]/route");
  const deal = await import("../deal-strategy/route");
  const brain = await import("../sales-brain/route");
  return [
    { name: "activities GET", run: () => act.GET(req(), params()), stores: () => [m.getActivitiesByLeadId] },
    { name: "activities POST", run: () => act.POST(req("POST", { note: "x" }), params()), stores: () => [m.createActivity] },
    { name: "moves GET", run: () => mov.GET(req(), params()), stores: () => [m.getPipelineMovesByLeadId] },
    {
      name: "moves POST",
      run: () => mov.POST(req("POST", { fromStatus: "a", toStatus: "b" }), params()),
      stores: () => [m.appendPipelineMove],
    },
    { name: "leads/[id] GET", run: () => lead.GET(req(), params()), stores: () => [] },
    {
      name: "tasks PATCH",
      run: () => tasks.PATCH(req("PATCH", { leadId: ID, title: "t" }), params()),
      stores: () => [m.updateTask],
    },
    { name: "tasks DELETE", run: () => tasks.DELETE(req("DELETE"), params()), stores: () => [m.deleteTask] },
    { name: "deal-strategy GET", run: () => deal.GET(req(), params()), stores: () => [m.generateDealStrategy] },
    { name: "sales-brain GET", run: () => brain.GET(req(), params()), stores: () => [m.analyzeSalesBrain] },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  m.getActivitiesByLeadId.mockResolvedValue([]);
  m.createActivity.mockResolvedValue({ id: "a1" });
  m.getLead.mockResolvedValue({ id: ID, name: "L" });
  m.getPipelineMovesByLeadId.mockResolvedValue([]);
  m.appendPipelineMove.mockResolvedValue(undefined);
  m.deleteTask.mockResolvedValue(undefined);
  m.updateTask.mockResolvedValue({ id: "t1", status: "open", priority: "high" });
  m.generateDealStrategy.mockResolvedValue({});
  m.analyzeSalesBrain.mockResolvedValue({});
  m.taskRow.mockResolvedValue({ data: { lead_id: ID } });
});

describe("TENANT-GATE-2 fail-closed", () => {
  it.each([
    ["volajúci bez agency_id, cudzí lead", { agency_id: null }, { agency_id: "agency-b" }],
    ["volajúci z inej agentúry", { agency_id: "agency-a" }, { agency_id: "agency-b" }],
    ["lead bez agency_id", { agency_id: "agency-a" }, { agency_id: null }],
    ["oboje bez agency_id", { agency_id: null }, { agency_id: null }],
  ])("403 a store sa nezavolá: %s", async (_n, caller, leadRow) => {
    m.profile.mockResolvedValue({ data: { ...caller, id: "p1" } });
    m.lead.mockResolvedValue({ data: { id: ID, ...leadRow }, error: null });
    for (const c of await cases()) {
      vi.clearAllMocks();
      m.taskRow.mockResolvedValue({ data: { lead_id: ID } });
      const res = await c.run();
      expect(res.status, c.name).toBe(403);
      for (const s of c.stores()) expect(s as ReturnType<typeof vi.fn>, c.name).not.toHaveBeenCalled();
    }
  });

  it("rovnaká agentúra prejde a moves dostanú scoped klienta", async () => {
    m.profile.mockResolvedValue({ data: { agency_id: "agency-a", id: "p1" } });
    m.lead.mockResolvedValue({ data: { id: ID, agency_id: "agency-a" }, error: null });
    for (const c of await cases()) {
      const res = await c.run();
      expect(res.status, c.name).toBe(200);
    }
    expect(m.getPipelineMovesByLeadId).toHaveBeenCalledWith(ID, m.scoped);
    expect(m.appendPipelineMove.mock.calls[0].at(-1)).toBe(m.scoped);
  });

  it("tasks DELETE: volajúci bez agency_id nezmaže ani úlohu bez leadu", async () => {
    m.profile.mockResolvedValue({ data: { agency_id: null, id: "p1" } });
    m.taskRow.mockResolvedValue({ data: { lead_id: null } });
    const { DELETE } = await import("../../../tasks/[id]/route");
    const res = await DELETE(req("DELETE"), params());
    expect(res.status).toBe(403);
    expect(m.deleteTask).not.toHaveBeenCalled();
  });
});
