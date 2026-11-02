import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Global AI recommendations recalculate must not DELETE ai_recommendations
 * when listLeads is empty (prod soft-fail), hits LEADS_LIST_MAX (truncated
 * lead page), or the match read hits MATCHES_READ_MAX (PostgREST page) —
 * otherwise off-page / off-cap rows are wiped with HTTP 200.
 *
 * Per-lead recalculate must read matches via lead_id filter, not the global
 * top-MATCHES_READ_MAX page (a lead below that cut looked like "no matches").
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
  MATCHES_READ_MAX,
  recalculateAllRecommendations,
  recalculateRecommendationsForLead,
} from "../recommendations-store";

type MatchResult = { data: unknown[] | null; error: { message: string } | null };

function scopedClient(matchResult: MatchResult = { data: [], error: null }) {
  const ops: { op: string; table?: string; filter?: string; rows?: unknown[] }[] = [];
  const done = Promise.resolve({ error: null, data: [] });
  const client = {
    from: (table: string) => {
      if (table === "lead_property_matches") {
        const chain: {
          select: () => typeof chain;
          eq: (col: string, val: string) => typeof chain;
          order: () => typeof chain;
          limit: () => Promise<MatchResult>;
        } = {
          select: () => chain,
          eq: (col: string, val: string) => {
            ops.push({ op: "match-eq", table, filter: `${col}=${val}` });
            return chain;
          },
          order: () => chain,
          limit: async () => matchResult,
        };
        return chain;
      }
      return {
        delete: () => {
          ops.push({ op: "delete", table });
          return { not: () => done, eq: () => done };
        },
        insert: (rows: unknown[]) => {
          ops.push({ op: "insert", table, rows });
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

    expect(ops.filter((o) => o.op === "delete")).toEqual([]);
    expect(res.totalRows).toBe(0);
    expect(res.totalLeads).toBe(0);
  });

  it("LIST_MAX lead page → no global delete (avoids off-page wipe)", async () => {
    const { client, ops } = scopedClient();
    listLeadsMock.mockResolvedValue(
      Array.from({ length: 500 }, (_, i) => ({ ...LEAD, id: `lead-${i}` })),
    );

    const res = await recalculateAllRecommendations(client);

    expect(ops.filter((o) => o.op === "delete")).toEqual([]);
    expect(res.totalRows).toBe(0);
    expect(res.totalLeads).toBe(500);
  });

  it("MATCHES_READ_MAX match page → no global delete (avoids off-page match wipe)", async () => {
    const fullPage = Array.from({ length: MATCHES_READ_MAX }, (_, i) => ({
      lead_id: `lead-${i % 50}`,
      property_id: `prop-${i}`,
      score: 90,
      reasons: [],
    }));
    const { client, ops } = scopedClient({ data: fullPage, error: null });
    listLeadsMock.mockResolvedValue([LEAD]);

    const res = await recalculateAllRecommendations(client);

    expect(ops.filter((o) => o.op === "delete")).toEqual([]);
    expect(res.totalRows).toBe(0);
    expect(res.totalMatches).toBe(MATCHES_READ_MAX);
  });

  it("under LIST_MAX with leads and under match cap → delete then insert", async () => {
    const { client, ops } = scopedClient();
    listLeadsMock.mockResolvedValue([LEAD]);

    const res = await recalculateAllRecommendations(client);

    expect(ops.map((o) => o.op)).toEqual(["delete", "insert"]);
    expect(res.totalRows).toBe(1);
    expect(res.totalLeads).toBe(1);
  });
});

describe("recalculateRecommendationsForLead match scope", () => {
  it("reads matches filtered by lead_id (not global top page then filter)", async () => {
    const { client, ops } = scopedClient({
      data: [
        {
          lead_id: "lead-1",
          property_id: "prop-1",
          score: 88,
          reasons: ["fit"],
        },
      ],
      error: null,
    });
    listLeadsMock.mockResolvedValue([LEAD]);

    const res = await recalculateRecommendationsForLead("lead-1", client);

    expect(ops.some((o) => o.op === "match-eq" && o.filter === "lead_id=lead-1")).toBe(
      true,
    );
    expect(ops.map((o) => o.op)).toContain("delete");
    expect(ops.map((o) => o.op)).toContain("insert");
    expect(res.inserted).toBe(1);
  });
});
