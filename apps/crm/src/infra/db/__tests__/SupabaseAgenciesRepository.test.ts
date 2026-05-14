import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupabaseAgenciesRepository } from "../SupabaseAgenciesRepository";
import type { DiscoveredAgency } from "@/domain/agency/AgencyDiscovery";

// ── helpers ──────────────────────────────────────────────

function makeAgency(overrides: Partial<DiscoveredAgency> = {}): DiscoveredAgency {
  return {
    externalId: "aaaa-bbbb-cccc-dddd",
    name: "Test RK",
    website: "https://example.com",
    email: "rk@example.com",
    phone: "+421900111222",
    city: "Bratislava",
    country: "SK",
    portal: "nehnutelnosti.sk",
    listingsCount: 42,
    ...overrides,
  };
}

/** Builds a chainable mock that mimics Supabase PostgREST builder */
function chainable(terminalValue: unknown = { data: null, error: null }) {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      // Terminal methods return the value
      if (prop === "then") return undefined; // not thenable by default
      if (prop === "maybeSingle" || prop === "single") {
        return () => Promise.resolve(terminalValue);
      }
      // Everything else returns a new chainable proxy
      return (..._args: unknown[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

function createMockSupabase() {
  const calls: { table: string; method: string; args: unknown[] }[] = [];

  // Track what each .from(table) chain does
  const fromMock = vi.fn((table: string) => {
    const builder = {
      select: (...args: unknown[]) => {
        calls.push({ table, method: "select", args });
        return {
          eq: (...eqArgs: unknown[]) => ({
            eq: () => ({
              maybeSingle: () => {
                // Return existing agency for update scenario
                if (
                  table === "agencies" &&
                  (fromMock as any).__existingId
                ) {
                  return Promise.resolve({
                    data: { id: (fromMock as any).__existingId },
                    error: null,
                  });
                }
                return Promise.resolve({ data: null, error: null });
              },
            }),
          }),
        };
      },
      insert: (payload: unknown) => {
        calls.push({ table, method: "insert", args: [payload] });
        return {
          select: () => ({
            single: () =>
              Promise.resolve({
                data: { id: "new-uuid-1234" },
                error: null,
              }),
          }),
        };
      },
      update: (payload: unknown) => {
        calls.push({ table, method: "update", args: [payload] });
        return {
          eq: () => Promise.resolve({ data: null, error: null }),
        };
      },
    };
    return builder;
  });

  return { from: fromMock, __calls: calls };
}

// ── tests ────────────────────────────────────────────────

describe("SupabaseAgenciesRepository", () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let repo: SupabaseAgenciesRepository;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    repo = new SupabaseAgenciesRepository(mockSupabase as any);
  });

  it("returns zeros for empty input", async () => {
    const result = await repo.upsertDiscoveredAgencies([]);
    expect(result).toEqual({ created: 0, updated: 0 });
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("creates a new agency + listings_snapshot when not existing", async () => {
    const agency = makeAgency();
    const result = await repo.upsertDiscoveredAgencies([agency]);

    expect(result).toEqual({ created: 1, updated: 0 });

    // Should have called agencies insert
    const agencyInsert = mockSupabase.__calls.find(
      (c) => c.table === "agencies" && c.method === "insert"
    );
    expect(agencyInsert).toBeDefined();
    expect((agencyInsert!.args[0] as any).external_id).toBe(agency.externalId);
    expect((agencyInsert!.args[0] as any).name).toBe(agency.name);
    expect((agencyInsert!.args[0] as any).portal).toBe(agency.portal);

    // Should have inserted listings_snapshot
    const snapshotInsert = mockSupabase.__calls.find(
      (c) => c.table === "listings_snapshot" && c.method === "insert"
    );
    expect(snapshotInsert).toBeDefined();
    expect((snapshotInsert!.args[0] as any).listings_count).toBe(42);
  });

  it("updates existing agency + inserts listings_snapshot", async () => {
    // Signal that agency already exists
    (mockSupabase.from as any).__existingId = "existing-uuid-5678";

    const agency = makeAgency({ name: "Updated RK", listingsCount: 99 });
    const result = await repo.upsertDiscoveredAgencies([agency]);

    expect(result).toEqual({ created: 0, updated: 1 });

    // Should have called agencies update
    const agencyUpdate = mockSupabase.__calls.find(
      (c) => c.table === "agencies" && c.method === "update"
    );
    expect(agencyUpdate).toBeDefined();
    expect((agencyUpdate!.args[0] as any).name).toBe("Updated RK");
    expect((agencyUpdate!.args[0] as any).listings_count).toBe(99);

    // Should have inserted listings_snapshot
    const snapshotInsert = mockSupabase.__calls.find(
      (c) => c.table === "listings_snapshot" && c.method === "insert"
    );
    expect(snapshotInsert).toBeDefined();
    expect((snapshotInsert!.args[0] as any).agency_id).toBe(
      "existing-uuid-5678"
    );
  });

  it("handles multiple agencies in one batch", async () => {
    const agencies = [
      makeAgency({ externalId: "id-1", name: "RK Alfa" }),
      makeAgency({ externalId: "id-2", name: "RK Beta" }),
    ];
    const result = await repo.upsertDiscoveredAgencies(agencies);

    // Both are new (mock returns null for maybeSingle by default)
    expect(result).toEqual({ created: 2, updated: 0 });

    const inserts = mockSupabase.__calls.filter(
      (c) => c.table === "agencies" && c.method === "insert"
    );
    expect(inserts).toHaveLength(2);
  });
});
