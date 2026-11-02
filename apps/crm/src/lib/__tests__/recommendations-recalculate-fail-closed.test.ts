import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Global / per-lead AI recommendations recalculate must not DELETE
 * ai_recommendations when:
 * - listLeads is empty (prod soft-fail) or hits LEADS_LIST_MAX (truncated page)
 * - lead_property_matches read errors (soft-fail used to look like "no matches")
 * Otherwise stored rows are wiped with HTTP 200.
 */

const listLeadsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/resolve-client", () => ({
  resolveTenantSupabase: async (scoped: unknown) => scoped ?? null,
}));
vi.mock("@/lib/supabase/client", () => ({
  supabaseClient: {},
  getSupabaseClient: vi.fn(),
}));
vi.mock("@/lib/leads-store", () => ({
  listLeads: (...a: unknown[]) => listLeadsMock(...a),
  LEADS_LIST_MAX: 500,
}));
vi.mock("@/lib/recommendations-engine", () => ({
  generateRecommendationsForLead: (lead: { id: string }) => [
    {
      leadId: lead.id,
      propertyId: null,
      recommendationType: "next_best_action",
      title: "Kontaktovať",
      description: "test",
      priority: "high",
      status: "active",
      modelVersion: "v1",
    },
  ],
}));

import {
  recalculateAllRecommendations,
  recalculateRecommendationsForLead,
} from "../recommendations-store";

function scopedClient(matchResult: { data: unknown[] | null; error: { message: string } | null } = {
  data: [],
  error: null,
}) {
  const ops: { op: string; rows?: unknown[] }[] = [];
  const done = Promise.resolve({ error: null, data: [] });
  const client = {
    from: (table: string) => {
      if (table === "lead_property_matches") {
        return {
          select: () => ({
            order: async () => matchResult,
          }),
        };
      }
      return {
        delete: () => {
          ops.push({ op: "delete" });
          return { not: () => done, eq: () => done };
        },
        insert: (rows: unknown[]) => {
          ops.push({ op: "insert", rows });
          return done;
        },
      };
    },
  };
  return { client: client as never, ops };
}

const LEAD = {
  id: "lead-1",
  name: "Test",
  status: "Nový",
  score: 80,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recalculateAllRecommendations fail-closed", () => {
  it("empty lead read → no global delete (keeps stored recommendations)", async () => {
    const { client, ops } = scopedClient();
    listLeadsMock.mockResolvedValue([]);

    const res = await recalculateAllRecommendations(client);

    expect(ops).toEqual([]);
    expect(res.totalRows).toBe(0);
    expect(res.totalLeads).toBe(0);
  });

  it("LIST_MAX lead page → no global delete (avoids off-page wipe)", async () => {
    const { client, ops } = scopedClient();
    listLeadsMock.mockResolvedValue(
      Array.from({ length: 500 }, (_, i) => ({ ...LEAD, id: `lead-${i}` })),
    );

    const res = await recalculateAllRecommendations(client);

    expect(ops).toEqual([]);
    expect(res.totalRows).toBe(0);
    expect(res.totalLeads).toBe(500);
  });

  it("match read error → no global delete (keeps stored recommendations)", async () => {
    const { client, ops } = scopedClient({
      data: null,
      error: { message: "connection reset" },
    });
    listLeadsMock.mockResolvedValue([LEAD]);

    const res = await recalculateAllRecommendations(client);

    expect(ops).toEqual([]);
    expect(res.totalRows).toBe(0);
    expect(res.totalLeads).toBe(1);
    expect(res.totalMatches).toBe(0);
  });

  it("honest empty matches under LIST_MAX → delete then insert", async () => {
    const { client, ops } = scopedClient({ data: [], error: null });
    listLeadsMock.mockResolvedValue([LEAD]);

    const res = await recalculateAllRecommendations(client);

    expect(ops.map((o) => o.op)).toEqual(["delete", "insert"]);
    expect(res.totalRows).toBe(1);
    expect(res.totalLeads).toBe(1);
  });
});

describe("recalculateRecommendationsForLead fail-closed", () => {
  it("match read error → no per-lead delete", async () => {
    const { client, ops } = scopedClient({
      data: null,
      error: { message: "timeout" },
    });
    listLeadsMock.mockResolvedValue([LEAD]);

    const res = await recalculateRecommendationsForLead("lead-1", client);

    expect(ops).toEqual([]);
    expect(res.inserted).toBe(0);
  });
});
