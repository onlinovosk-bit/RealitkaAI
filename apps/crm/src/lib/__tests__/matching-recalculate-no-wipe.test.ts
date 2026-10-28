import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * DELETE-then-INSERT left a wipe window: insert timeout after delete returned
 * inserted:0 (HTTP 200) with zero matches. Persist must upsert first.
 */

const listLeadsMock = vi.hoisted(() => vi.fn());
const getLeadMock = vi.hoisted(() => vi.fn());
const listPropertiesMock = vi.hoisted(() => vi.fn());
const getPropertyMock = vi.hoisted(() => vi.fn());
const forLeadMock = vi.hoisted(() => vi.fn());
const forPropertyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/resolve-client", () => ({
  resolveTenantSupabase: async (scoped: unknown) => scoped ?? null,
}));
vi.mock("@/lib/supabase/client", () => ({ supabaseClient: {}, getSupabaseClient: vi.fn() }));
vi.mock("@/lib/leads-store", () => ({
  listLeads: (...a: unknown[]) => listLeadsMock(...a),
  getLead: (...a: unknown[]) => getLeadMock(...a),
}));
vi.mock("@/lib/properties-store", () => ({
  listProperties: (...a: unknown[]) => listPropertiesMock(...a),
  getProperty: (...a: unknown[]) => getPropertyMock(...a),
}));
vi.mock("@/lib/matching", () => ({
  getMatchingPropertiesForLead: (...a: unknown[]) => forLeadMock(...a),
  getMatchingLeadsForProperty: (...a: unknown[]) => forPropertyMock(...a),
}));

import {
  recalculateAllMatches,
  recalculateMatchesForLead,
  recalculateMatchesForProperty,
} from "../matching-store";

type Op = { op: string; rows?: unknown[]; ids?: string[] };

function scopedClient(opts?: { upsertError?: Error | null; failUpsertOnce?: boolean }) {
  const ops: Op[] = [];
  let upsertCalls = 0;
  const existing = [
    { id: "old-1", lead_id: "lead-1", property_id: "prop-old" },
    { id: "keep-1", lead_id: "lead-1", property_id: "prop-1" },
  ];

  const client = {
    from: () => ({
      upsert: (rows: unknown[]) => {
        upsertCalls += 1;
        ops.push({ op: "upsert", rows });
        if (opts?.upsertError && (!opts.failUpsertOnce || upsertCalls === 1)) {
          return Promise.reject(opts.upsertError);
        }
        return Promise.resolve({ error: null });
      },
      insert: (rows: unknown[]) => {
        ops.push({ op: "insert", rows });
        return Promise.resolve({ error: null });
      },
      select: () => {
        ops.push({ op: "select" });
        const result = Promise.resolve({ data: existing, error: null });
        return {
          eq: () => result,
          then: result.then.bind(result),
        };
      },
      delete: () => {
        const chain: Record<string, unknown> = {};
        chain.eq = () => {
          ops.push({ op: "delete-eq" });
          return Promise.resolve({ error: null });
        };
        chain.not = () => {
          ops.push({ op: "delete-not" });
          return Promise.resolve({ error: null });
        };
        chain.in = (col: string, ids: string[]) => {
          ops.push({ op: "delete-in", ids });
          return Promise.resolve({ error: null });
        };
        return chain;
      },
    }),
  };
  return { client: client as never, ops };
}

const LEAD = { id: "lead-1" };
const PROPERTY = { id: "prop-1" };

beforeEach(() => {
  vi.clearAllMocks();
  forLeadMock.mockReturnValue([{ propertyId: "prop-1", matchScore: 80, reasons: ["lokalita sedí"] }]);
  forPropertyMock.mockReturnValue([{ leadId: "lead-1", matchScore: 80, reasons: ["lokalita sedí"] }]);
});

describe("recalculateMatchesForLead — no wipe window", () => {
  it("upserts before deleting orphans", async () => {
    const { client, ops } = scopedClient();
    getLeadMock.mockResolvedValue(LEAD);
    listPropertiesMock.mockResolvedValue([PROPERTY]);

    const res = await recalculateMatchesForLead("lead-1", client);

    expect(ops.map((o) => o.op)[0]).toBe("upsert");
    expect(ops.map((o) => o.op)).not.toContain("insert");
    expect(ops.some((o) => o.op === "delete-in")).toBe(true);
    expect(res.inserted).toBe(1);
  });

  it("upsert timeout keeps existing matches (no delete)", async () => {
    const { client, ops } = scopedClient({
      upsertError: new Error("Matching DB timeout (recalculateLead:upsert) after 8000ms"),
    });
    getLeadMock.mockResolvedValue(LEAD);
    listPropertiesMock.mockResolvedValue([PROPERTY]);

    const res = await recalculateMatchesForLead("lead-1", client);

    expect(ops.map((o) => o.op)).toEqual(["upsert"]);
    expect(res.inserted).toBe(0);
  });
});

describe("recalculateMatchesForProperty — no wipe window", () => {
  it("upserts before orphan cleanup", async () => {
    const { client, ops } = scopedClient();
    getPropertyMock.mockResolvedValue(PROPERTY);
    listLeadsMock.mockResolvedValue([LEAD]);

    const res = await recalculateMatchesForProperty("prop-1", client);

    expect(ops.map((o) => o.op)[0]).toBe("upsert");
    expect(res.inserted).toBe(1);
  });
});

describe("recalculateAllMatches — no wipe window", () => {
  it("upserts before orphan cleanup", async () => {
    const { client, ops } = scopedClient();
    listLeadsMock.mockResolvedValue([LEAD]);
    listPropertiesMock.mockResolvedValue([PROPERTY]);

    const res = await recalculateAllMatches(client);

    expect(ops.map((o) => o.op)[0]).toBe("upsert");
    expect(ops.map((o) => o.op)).not.toContain("delete-not");
    expect(res.totalRows).toBe(1);
  });

  it("upsert timeout does not wipe the agency", async () => {
    const { client, ops } = scopedClient({
      upsertError: new Error("Matching DB timeout (recalculateAll:upsert) after 8000ms"),
    });
    listLeadsMock.mockResolvedValue([LEAD]);
    listPropertiesMock.mockResolvedValue([PROPERTY]);

    const res = await recalculateAllMatches(client);

    expect(ops.map((o) => o.op)).toEqual(["upsert"]);
    expect(res.totalRows).toBe(0);
  });
});
