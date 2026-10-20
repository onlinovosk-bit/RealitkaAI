import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  getCurrentUser: vi.fn(),
  getCurrentProfile: vi.fn(),
  generateEmbedding: vi.fn(),
  incrementUsageMetric: vi.fn(),
  adminRpc: vi.fn(),
  sessionRpc: vi.fn(),
  eq: vi.fn(),
  or: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  getCurrentProfile: mocks.getCurrentProfile,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/lib/embeddings", () => ({ generateEmbedding: mocks.generateEmbedding }));
vi.mock("@/lib/usage-metrics", () => ({
  incrementUsageMetric: mocks.incrementUsageMetric,
  SYSTEM_USAGE_AGENCY_ID: "system",
}));

const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002";

// "DB": l-own patrí agentúre A, l-foreign agentúre B.
const ROWS = [
  { id: "l-own", agency_id: AGENCY_A, name: "Vlastný", location: "BA", status: "new", score: 5, budget: "1" },
  { id: "l-foreign", agency_id: AGENCY_B, name: "Cudzí", location: "KE", status: "new", score: 9, budget: "2" },
];

// Mock session klienta bez RLS simulácie: izoláciu musí zabezpečiť samotná route (eq agency_id).
function sessionClient() {
  return {
    auth: { getUser: async () => ({ data: { user: { id: "u-1" } } }) },
    rpc: mocks.sessionRpc,
    from: () => {
      let rows = ROWS;
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.eq = (col: string, val: string) => {
        mocks.eq(col, val);
        rows = rows.filter((r) => (r as Record<string, unknown>)[col] === val);
        return q;
      };
      q.in = (_c: string, ids: string[]) => {
        rows = rows.filter((r) => ids.includes(r.id));
        return q;
      };
      q.or = (f: string) => {
        mocks.or(f);
        return q;
      };
      q.limit = async () => ({ data: rows.filter((r) => r.agency_id === AGENCY_A), error: null });
      q.then = (res: (v: unknown) => unknown) => res({ data: rows, error: null });
      return q;
    },
  };
}

function req(body: Record<string, unknown> = { query: "byt Bratislava", type: "leads", limit: 2 }) {
  return new Request("http://localhost/api/search/semantic", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function payload(res: Response) {
  const json = await res.json();
  return (json.data ?? json) as { mode: string; results: Array<{ id: string }> };
}

describe("POST /api/search/semantic — service_role RPC + tenant izolácia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.createClient.mockResolvedValue(sessionClient());
    mocks.createAdminClient.mockReturnValue({ rpc: mocks.adminRpc });
    mocks.getCurrentUser.mockResolvedValue({ id: "u-1" });
    mocks.getCurrentProfile.mockResolvedValue({ id: "p-1", agency_id: AGENCY_A });
    mocks.generateEmbedding.mockResolvedValue({ embedding: [0.1, 0.2], totalTokens: 3 });
    mocks.adminRpc.mockResolvedValue({
      data: [
        { id: "l-foreign", similarity: 0.95 },
        { id: "l-own", similarity: 0.8 },
      ],
      error: null,
    });
  });

  it("RPC ide cez admin klienta, nie cez session klienta", async () => {
    const body = await payload(await POST(req()));

    expect(mocks.adminRpc).toHaveBeenCalledWith(
      "match_leads",
      expect.objectContaining({ query_embedding: [0.1, 0.2] })
    );
    expect(mocks.sessionRpc).not.toHaveBeenCalled();
    expect(body.mode).toBe("semantic");
  });

  it("id z cudzej agentúry sa zahodia (aj s najvyššou podobnosťou)", async () => {
    const body = await payload(await POST(req()));

    expect(body.results.map((r) => r.id)).toEqual(["l-own"]);
    expect(mocks.eq).toHaveBeenCalledWith("agency_id", AGENCY_A);
  });

  it("volajúci bez agency_id: RPC sa nevolá, ide ILIKE fallback", async () => {
    mocks.getCurrentProfile.mockResolvedValue({ id: "p-1", agency_id: null });
    const body = await payload(await POST(req()));

    expect(mocks.adminRpc).not.toHaveBeenCalled();
    expect(body.mode).toBe("fallback");
  });

  it("RPC chyba -> ILIKE fallback a varovanie v logu", async () => {
    mocks.adminRpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied for function match_leads" },
    });
    const body = await payload(await POST(req()));

    expect(body.mode).toBe("fallback");
    expect(mocks.or).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });
});
