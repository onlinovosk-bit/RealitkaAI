import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * MATCHING-ZERO: recalculations read leads/properties through the same client
 * they write with, and an empty read never wipes stored matches.
 * Before the fix the reads fell back to the browser singleton on the server,
 * found no agency, returned [] — and the delete still ran (PROD: 0 matches).
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

/** Records upsert/orphan-delete ops on lead_property_matches. */
function scopedClient() {
  const ops: { op: string; rows?: unknown[] }[] = [];
  const done = Promise.resolve({ data: [], error: null });
  const client = {
    from: () => ({
      upsert: (rows: unknown[]) => {
        ops.push({ op: "upsert", rows });
        return done;
      },
      insert: (rows: unknown[]) => {
        ops.push({ op: "insert", rows });
        return done;
      },
      select: () => {
        ops.push({ op: "select" });
        return { eq: () => done, then: done.then.bind(done) };
      },
      delete: () => {
        ops.push({ op: "delete" });
        const chain = { eq: () => done, not: () => done, in: () => done };
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

describe("recalculateAllMatches", () => {
  it("reads leads and properties through the caller's client", async () => {
    const { client } = scopedClient();
    listLeadsMock.mockResolvedValue([LEAD]);
    listPropertiesMock.mockResolvedValue([PROPERTY]);

    const res = await recalculateAllMatches(client);

    expect(listLeadsMock).toHaveBeenCalledWith(undefined, client);
    expect(listPropertiesMock).toHaveBeenCalledWith(undefined, client);
    expect(res.totalRows).toBe(1);
  });

  it("an empty read does not wipe stored matches", async () => {
    const { client, ops } = scopedClient();
    listLeadsMock.mockResolvedValue([]);
    listPropertiesMock.mockResolvedValue([PROPERTY]);

    const res = await recalculateAllMatches(client);

    expect(ops).toEqual([]);
    expect(res.totalRows).toBe(0);
  });
});

describe("recalculateMatchesForProperty", () => {
  it("reads the property and leads through the caller's client", async () => {
    const { client, ops } = scopedClient();
    getPropertyMock.mockResolvedValue(PROPERTY);
    listLeadsMock.mockResolvedValue([LEAD]);

    const res = await recalculateMatchesForProperty("prop-1", client);

    expect(getPropertyMock).toHaveBeenCalledWith("prop-1", client);
    expect(listLeadsMock).toHaveBeenCalledWith(undefined, client);
    expect(ops.map((o) => o.op)[0]).toBe("upsert");
    expect(ops.map((o) => o.op)).not.toContain("insert");
    expect(res.inserted).toBe(1);
  });

  it("no leads read → keeps the property's stored matches", async () => {
    const { client, ops } = scopedClient();
    getPropertyMock.mockResolvedValue(PROPERTY);
    listLeadsMock.mockResolvedValue([]);

    await recalculateMatchesForProperty("prop-1", client);

    expect(ops).toEqual([]);
  });
});

describe("recalculateMatchesForLead", () => {
  it("reads the lead and properties through the caller's client", async () => {
    const { client, ops } = scopedClient();
    getLeadMock.mockResolvedValue(LEAD);
    listPropertiesMock.mockResolvedValue([PROPERTY]);

    const res = await recalculateMatchesForLead("lead-1", client);

    expect(getLeadMock).toHaveBeenCalledWith("lead-1", client);
    expect(listPropertiesMock).toHaveBeenCalledWith(undefined, client);
    expect(ops.map((o) => o.op)).toEqual(["delete", "insert"]);
    expect(res.inserted).toBe(1);
  });

  it("no properties read → keeps the lead's stored matches", async () => {
    const { client, ops } = scopedClient();
    getLeadMock.mockResolvedValue(LEAD);
    listPropertiesMock.mockResolvedValue([]);

    const res = await recalculateMatchesForLead("lead-1", client);

    expect(ops).toEqual([]);
    expect(res.inserted).toBe(0);
    expect(forLeadMock).not.toHaveBeenCalled();
  });
});
