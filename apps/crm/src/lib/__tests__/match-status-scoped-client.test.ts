import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveTenantSupabaseMock = vi.fn();
const getPropertyMock = vi.fn();

vi.mock("@/lib/supabase/resolve-client", () => ({
  resolveTenantSupabase: (...args: unknown[]) => resolveTenantSupabaseMock(...args),
}));

vi.mock("@/lib/properties-store", () => ({
  getProperty: (...args: unknown[]) => getPropertyMock(...args),
  listProperties: vi.fn(),
}));

vi.mock("@/lib/leads-store", () => ({
  listLeads: vi.fn(),
  getLead: vi.fn(),
}));

vi.mock("@/lib/matching", () => ({
  getMatchingPropertiesForLead: vi.fn(),
  getMatchingLeadsForProperty: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabaseClient: {},
  getSupabaseClient: vi.fn(),
}));

const EXISTING = {
  id: "match-1",
  lead_id: "lead-1",
  property_id: "prop-1",
  score: 80,
  reasons: ["lokalita sedí"],
  model_version: "v2",
  status: "sent",
  created_at: "2026-09-15T00:00:00.000Z",
};

const UPDATED = {
  ...EXISTING,
  status: "interested",
};

/** Minimal Supabase select/update chain recorder for lead_property_matches. */
function matchClient() {
  const calls: { selectEq?: string[]; update?: Record<string, unknown>; updateEq?: string[] } = {};
  return {
    calls,
    from: () => ({
      select: () => ({
        eq: (_col: string, val: string) => {
          calls.selectEq = [...(calls.selectEq ?? []), val];
          return {
            eq: (_col2: string, val2: string) => {
              calls.selectEq = [...(calls.selectEq ?? []), val2];
              return {
                maybeSingle: async () => ({ data: EXISTING, error: null }),
              };
            },
          };
        },
      }),
      update: (patch: Record<string, unknown>) => {
        calls.update = patch;
        return {
          eq: (_col: string, val: string) => {
            calls.updateEq = [...(calls.updateEq ?? []), val];
            return {
              eq: (_col2: string, val2: string) => {
                calls.updateEq = [...(calls.updateEq ?? []), val2];
                return {
                  select: () => ({
                    single: async () => ({ data: UPDATED, error: null }),
                  }),
                };
              },
            };
          },
        };
      },
    }),
  };
}

describe("updateLeadPropertyMatchStatus — scoped client is threaded through", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPropertyMock.mockResolvedValue({
      id: "prop-1",
      title: "3i byt Ružinov",
      location: "Bratislava",
    });
  });

  it("passes the caller's scoped client to resolveTenantSupabase", async () => {
    const client = matchClient();
    resolveTenantSupabaseMock.mockResolvedValue(client);
    const scoped = { marker: "scoped-client" } as never;

    const { updateLeadPropertyMatchStatus } = await import("@/lib/matching-store");
    await updateLeadPropertyMatchStatus("lead-1", "match-1", "interested", scoped);

    expect(resolveTenantSupabaseMock).toHaveBeenCalledWith(scoped);
  });

  it("forwards the scoped client into getProperty for title resolution", async () => {
    const client = matchClient();
    resolveTenantSupabaseMock.mockResolvedValue(client);
    const scoped = { marker: "scoped-client" } as never;

    const { updateLeadPropertyMatchStatus } = await import("@/lib/matching-store");
    const result = await updateLeadPropertyMatchStatus(
      "lead-1",
      "match-1",
      "interested",
      scoped,
    );

    expect(getPropertyMock).toHaveBeenCalledWith("prop-1", scoped);
    expect(result.match).toMatchObject({
      id: "match-1",
      status: "interested",
      propertyTitle: "3i byt Ružinov",
    });
    expect(result.previousStatus).toBe("sent");
  });

  it("writes the new status through the resolved client", async () => {
    const client = matchClient();
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { updateLeadPropertyMatchStatus } = await import("@/lib/matching-store");
    await updateLeadPropertyMatchStatus("lead-1", "match-1", "rejected", {} as never);

    expect(client.calls.update).toEqual({ status: "rejected" });
  });
});
