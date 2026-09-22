import { beforeEach, describe, expect, it, vi } from "vitest";

const listLeads = vi.fn();
const listProperties = vi.fn();
const getLead = vi.fn();
const getProperty = vi.fn();
const getMatchingPropertiesForLead = vi.fn();
const getMatchingLeadsForProperty = vi.fn();
const resolveTenantSupabase = vi.fn();

vi.mock("@/lib/leads-store", () => ({
  listLeads: (...args: unknown[]) => listLeads(...args),
  getLead: (...args: unknown[]) => getLead(...args),
}));

vi.mock("@/lib/properties-store", () => ({
  listProperties: (...args: unknown[]) => listProperties(...args),
  getProperty: (...args: unknown[]) => getProperty(...args),
}));

vi.mock("@/lib/matching", () => ({
  getMatchingPropertiesForLead: (...args: unknown[]) => getMatchingPropertiesForLead(...args),
  getMatchingLeadsForProperty: (...args: unknown[]) => getMatchingLeadsForProperty(...args),
}));

vi.mock("@/lib/supabase/resolve-client", () => ({
  resolveTenantSupabase: (...args: unknown[]) => resolveTenantSupabase(...args),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabaseClient: null,
  getSupabaseClient: () => null,
}));

import {
  recalculateAllMatches,
  recalculateMatchesForLead,
  recalculateMatchesForProperty,
} from "@/lib/matching-store";

function makeScopedClient(handlers: {
  deleteResult?: { error: { message: string } | null };
  insertResult?: { error: { message: string } | null };
  onDelete?: () => void;
  onInsert?: (payload: unknown) => void;
}) {
  const deleteBuilder = {
    eq: vi.fn(async () => {
      handlers.onDelete?.();
      return handlers.deleteResult ?? { error: null };
    }),
    not: vi.fn(async () => {
      handlers.onDelete?.();
      return handlers.deleteResult ?? { error: null };
    }),
  };

  return {
    from: vi.fn((table: string) => {
      expect(table).toBe("lead_property_matches");
      return {
        delete: vi.fn(() => deleteBuilder),
        insert: vi.fn(async (payload: unknown) => {
          handlers.onInsert?.(payload);
          return handlers.insertResult ?? { error: null };
        }),
      };
    }),
  };
}

describe("matching-store recalculate scoped reads + fail-hard writes", () => {
  const scoped = { marker: "scoped-server-client" };

  beforeEach(() => {
    vi.clearAllMocks();
    resolveTenantSupabase.mockImplementation(async (passed?: unknown) => passed ?? scoped);
    getMatchingPropertiesForLead.mockReturnValue([
      { propertyId: "prop-1", matchScore: 80, reasons: ["lokácia"] },
    ]);
    getMatchingLeadsForProperty.mockReturnValue([
      { leadId: "lead-1", matchScore: 75, reasons: ["budget"] },
    ]);
  });

  it("recalculateAllMatches passes scoped client into listLeads/listProperties", async () => {
    const deleted: string[] = [];
    const inserted: unknown[] = [];
    const client = makeScopedClient({
      onDelete: () => deleted.push("all"),
      onInsert: (payload) => inserted.push(payload),
    });
    resolveTenantSupabase.mockResolvedValue(client);

    listLeads.mockResolvedValue([{ id: "lead-1" }]);
    listProperties.mockResolvedValue([{ id: "prop-1" }]);

    const result = await recalculateAllMatches(scoped as never);

    expect(listLeads).toHaveBeenCalledWith(undefined, scoped);
    expect(listProperties).toHaveBeenCalledWith(undefined, scoped);
    expect(deleted).toEqual(["all"]);
    expect(inserted).toHaveLength(1);
    expect(result.totalRows).toBe(1);
    expect(result.totalLeads).toBe(1);
  });

  it("recalculateMatchesForProperty passes scoped client into getProperty/listLeads", async () => {
    const client = makeScopedClient({});
    resolveTenantSupabase.mockResolvedValue(client);
    getProperty.mockResolvedValue({ id: "prop-1" });
    listLeads.mockResolvedValue([{ id: "lead-1" }]);

    await recalculateMatchesForProperty("prop-1", scoped as never);

    expect(getProperty).toHaveBeenCalledWith("prop-1", scoped);
    expect(listLeads).toHaveBeenCalledWith(undefined, scoped);
  });

  it("recalculateMatchesForLead throws when insert fails after delete (no silent wipe)", async () => {
    let deleted = false;
    const client = makeScopedClient({
      onDelete: () => {
        deleted = true;
      },
      insertResult: { error: { message: "Matching DB timeout (recalculateLead:insert) after 8000ms" } },
    });
    resolveTenantSupabase.mockResolvedValue(client);
    getLead.mockResolvedValue({ id: "lead-1" });
    listProperties.mockResolvedValue([{ id: "prop-1" }]);

    await expect(recalculateMatchesForLead("lead-1", scoped as never)).rejects.toThrow(/timeout/i);
    expect(deleted).toBe(true);
  });
});
