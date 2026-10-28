import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Global AI recommendations recalculate must not DELETE ai_recommendations
 * when listLeads is empty (prod soft-fail) or hits LEADS_LIST_MAX (truncated
 * inventory) — otherwise off-page / all rows are wiped with HTTP 200.
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

import { recalculateAllRecommendations } from "../recommendations-store";

function scopedClient() {
  const ops: { op: string; rows?: unknown[] }[] = [];
  const done = Promise.resolve({ error: null, data: [] });
  const client = {
    from: (table: string) => {
      if (table === "lead_property_matches") {
        return {
          select: () => ({
            order: async () => ({ data: [], error: null }),
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

  it("under LIST_MAX with leads → delete then insert", async () => {
    const { client, ops } = scopedClient();
    listLeadsMock.mockResolvedValue([LEAD]);

    const res = await recalculateAllRecommendations(client);

    expect(ops.map((o) => o.op)).toEqual(["delete", "insert"]);
    expect(res.totalRows).toBe(1);
    expect(res.totalLeads).toBe(1);
  });
});
