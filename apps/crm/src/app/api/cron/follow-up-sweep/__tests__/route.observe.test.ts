import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  leads: [] as Record<string, unknown>[],
  leadsError: null as string | null,
  plans: [] as Record<string, unknown>[],
  insertOk: true,
  recordCronRun: vi.fn(),
}));

function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "in", "lt", "order", "limit", "eq", "update", "insert"]) {
    b[m] = () => b;
  }
  b.maybeSingle = async () => ({ data: { ai_followup_count: 0 }, error: null });
  b.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () =>
      builder(
        mocks.leadsError
          ? { data: null, error: { message: mocks.leadsError } }
          : { data: mocks.leads, error: null },
      ),
  }),
}));

vi.mock("@/lib/ai/open-followup-generator", () => ({
  FOLLOWUP_PROMPT_VERSION: "test-v1",
  generateOpenFollowUpsBatch: async () => mocks.plans,
}));

vi.mock("@/lib/inbound/insert-agent-draft", () => ({
  insertAgentDraft: async () =>
    mocks.insertOk
      ? { ok: true, correlationId: "c", activityId: "a" }
      : { ok: false, error: "insert zlyhal" },
  recipientFor: () => "klient@example.sk",
}));

vi.mock("@/lib/ops/cron-run", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ops/cron-run")>();
  return { ...actual, recordCronRun: mocks.recordCronRun };
});

import { GET } from "../route";

const SECRET = "test-cron-secret";

function req(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/cron/follow-up-sweep", {
    headers: { authorization: `Bearer ${SECRET}`, ...headers },
  }) as unknown as Parameters<typeof GET>[0];
}

const sposobily = (id: string) => ({
  id,
  agency_id: "ag-1",
  name: "Test",
  email: "t@example.sk",
  status: "Nový",
  updated_at: "2026-01-01T00:00:00Z",
  last_ai_followup_at: null,
  ai_followup_count: 0,
  ai_priority: "high",
});

const plan = (leadId: string) => ({
  lead_id: leadId,
  should_contact: true,
  message: "Dobrý deň, ozývam sa k vášmu dopytu.",
  subject: "Follow-up",
  channel: "email",
  reason_sk: "5 dní bez reakcie",
  broker_cc_needed: false,
});

const zapis = () =>
  mocks.recordCronRun.mock.calls.at(-1)?.[1] as
    | { status: string; eligible?: number; written?: number; failed?: number; detail?: { planned?: number } }
    | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = SECRET;
  mocks.leads = [];
  mocks.leadsError = null;
  mocks.plans = [];
  mocks.insertOk = true;
  mocks.recordCronRun.mockResolvedValue(null);
});

describe("follow-up sweep zapisuje cron_runs, HTTP kód nemení", () => {
  it("401 bez secretu nezapisuje beh", async () => {
    const res = await GET(req({ authorization: "Bearer zle" }));
    expect(res.status).toBe(401);
    expect(mocks.recordCronRun).not.toHaveBeenCalled();
  });

  it("žiadni kandidáti → empty a 200", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(zapis()?.status).toBe("empty");
    expect(zapis()?.eligible).toBe(0);
  });

  it("chyba dotazu → failed a pôvodné 500", async () => {
    mocks.leadsError = "spojenie zlyhalo";
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(zapis()?.status).toBe("failed");
    expect(mocks.recordCronRun.mock.calls.at(-1)?.[1].firstError).toContain("spojenie zlyhalo");
  });

  it("úspešný beh → ok, HTTP ostáva 200", async () => {
    mocks.leads = [sposobily("l1")];
    mocks.plans = [plan("l1")];
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(zapis()).toMatchObject({ status: "ok", eligible: 1, written: 1, failed: 0 });
  });

  it("nič sa nezapísalo → failed v denníku, HTTP ostáva 200", async () => {
    mocks.leads = [sposobily("l1")];
    mocks.plans = [plan("l1")];
    mocks.insertOk = false;
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(zapis()).toMatchObject({ status: "failed", eligible: 1, written: 0, failed: 1 });
  });
});
