import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Global AI recommendations recalculate must not DELETE ai_recommendations
 * when listLeads is empty (prod soft-fail), hits LEADS_LIST_MAX (truncated
 * lead page), or the match read hits MATCHES_READ_MAX (PostgREST page) —
 * otherwise off-page / off-cap rows are wiped with HTTP 200.
 *
 * Per-lead recalculate must read matches via lead_id filter, not the global
 * top-MATCHES_READ_MAX page (a lead below that cut looked like "no matches").
 *
 * Persist must insert before orphan delete — insert failure keeps prior rows.
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

function scopedClient(options?: {
  matchResult?: MatchResult;
  insertError?: { message: string } | null;
  existingRecIds?: string[];
}) {
  const matchResult = options?.matchResult ?? { data: [], error: null };
  const insertError = options?.insertError ?? null;
  const existingRecIds = options?.existingRecIds ?? ["old-1"];
  const ops: { op: string; table?: string; filter?: string; rows?: unknown[] }[] = [];

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

      if (table === "ai_recommendations") {
        return {
          insert: (rows: unknown[]) => {
            ops.push({ op: "insert", table, rows });
            const insertChain = {
              select: async () => {
                if (insertError) {
                  return { data: null, error: insertError };
                }
                const data = (rows as unknown[]).map((_, i) => ({ id: `new-${i + 1}` }));
                return { data, error: null };
              },
            };
            return insertChain;
          },
          select: (_cols?: string) => {
            ops.push({ op: "select-orphans", table });
            const selectChain = {
              eq: (col: string, val: string) => {
                ops.push({ op: "orphan-eq", table, filter: `${col}=${val}` });
                return Promise.resolve({
                  data: existingRecIds.map((id) => ({ id })),
                  error: null,
                });
              },
              not: async () => ({
                data: existingRecIds.map((id) => ({ id })),
                error: null,
              }),
            };
            return selectChain;
          },
          delete: () => {
            ops.push({ op: "delete", table });
            return {
              in: async (col: string, ids: string[]) => {
                ops.push({ op: "delete-in", table, filter: `${col}=${ids.join(",")}` });
                return { error: null };
              },
              not: async () => ({ error: null }),
              eq: async () => ({ error: null }),
            };
          },
        };
      }

      return {
        delete: () => {
          ops.push({ op: "delete", table });
          return { not: async () => ({ error: null }), eq: async () => ({ error: null }) };
        },
        insert: (rows: unknown[]) => {
          ops.push({ op: "insert", table, rows });
          return { select: async () => ({ data: [], error: null }) };
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

    expect(ops.filter((o) => o.op === "delete" || o.op === "insert")).toEqual([]);
    expect(res.totalRows).toBe(0);
    expect(res.totalLeads).toBe(0);
  });

  it("LIST_MAX lead page → no global delete (avoids off-page wipe)", async () => {
    const { client, ops } = scopedClient();
    listLeadsMock.mockResolvedValue(
      Array.from({ length: 500 }, (_, i) => ({ ...LEAD, id: `lead-${i}` })),
    );

    const res = await recalculateAllRecommendations(client);

    expect(ops.filter((o) => o.op === "delete" || o.op === "insert")).toEqual([]);
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
    const { client, ops } = scopedClient({ matchResult: { data: fullPage, error: null } });
    listLeadsMock.mockResolvedValue([LEAD]);

    const res = await recalculateAllRecommendations(client);

    expect(ops.filter((o) => o.op === "delete" || o.op === "insert")).toEqual([]);
    expect(res.totalRows).toBe(0);
    expect(res.totalMatches).toBe(MATCHES_READ_MAX);
  });

  it("under LIST_MAX with leads and under match cap → insert then orphan delete", async () => {
    const { client, ops } = scopedClient({ existingRecIds: ["old-1", "new-1"] });
    listLeadsMock.mockResolvedValue([LEAD]);

    const res = await recalculateAllRecommendations(client);

    const mutateOps = ops.filter((o) =>
      ["insert", "select-orphans", "delete", "delete-in"].includes(o.op),
    );
    expect(mutateOps.map((o) => o.op)).toEqual([
      "insert",
      "select-orphans",
      "delete",
      "delete-in",
    ]);
    expect(ops.find((o) => o.op === "delete-in")?.filter).toBe("id=old-1");
    expect(res.totalRows).toBe(1);
    expect(res.totalLeads).toBe(1);
  });

  it("insert failure → no delete (keeps prior recommendations)", async () => {
    const { client, ops } = scopedClient({
      insertError: { message: "insert timeout" },
      existingRecIds: ["old-keep"],
    });
    listLeadsMock.mockResolvedValue([LEAD]);

    await expect(recalculateAllRecommendations(client)).rejects.toThrow("insert timeout");

    expect(ops.map((o) => o.op)).toEqual(["insert"]);
    expect(ops.filter((o) => o.op === "delete" || o.op === "delete-in")).toEqual([]);
  });
});

describe("recalculateRecommendationsForLead match scope", () => {
  it("reads matches filtered by lead_id (not global top page then filter)", async () => {
    const { client, ops } = scopedClient({
      matchResult: {
        data: [
          {
            lead_id: "lead-1",
            property_id: "prop-1",
            score: 88,
            reasons: ["fit"],
          },
        ],
        error: null,
      },
      existingRecIds: ["old-lead", "new-1"],
    });
    listLeadsMock.mockResolvedValue([LEAD]);

    const res = await recalculateRecommendationsForLead("lead-1", client);

    expect(ops.some((o) => o.op === "match-eq" && o.filter === "lead_id=lead-1")).toBe(
      true,
    );
    expect(ops.some((o) => o.op === "orphan-eq" && o.filter === "lead_id=lead-1")).toBe(
      true,
    );
    const mutateOps = ops
      .filter((o) => ["insert", "select-orphans", "delete", "delete-in"].includes(o.op))
      .map((o) => o.op);
    expect(mutateOps[0]).toBe("insert");
    expect(mutateOps).toContain("delete-in");
    expect(res.inserted).toBe(1);
  });

  it("insert failure on per-lead → no delete", async () => {
    const { client, ops } = scopedClient({
      insertError: { message: "network" },
    });
    listLeadsMock.mockResolvedValue([LEAD]);

    await expect(recalculateRecommendationsForLead("lead-1", client)).rejects.toThrow(
      "network",
    );
    expect(ops.filter((o) => o.op === "delete" || o.op === "delete-in")).toEqual([]);
  });
});
