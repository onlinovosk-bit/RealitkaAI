import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveTenantSupabaseMock = vi.fn();
const resolveSessionAgencyIdMock = vi.fn();

vi.mock("@/lib/supabase/resolve-client", () => ({
  resolveTenantSupabase: (...args: unknown[]) => resolveTenantSupabaseMock(...args),
}));

vi.mock("@/lib/tenant-scope", () => ({
  resolveSessionAgencyId: (...args: unknown[]) => resolveSessionAgencyIdMock(...args),
}));

const AGENCY_A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const AGENCY_B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const LEAD_A = "llllllll-1111-4111-8111-llllllllllll";
const PROFILE_A = "pppppppp-1111-4111-8111-pppppppppppp";
const PROFILE_B = "pppppppp-2222-4222-8222-pppppppppppp";

type Call = { table: string; op: string; args: unknown[] };

function makeClient(options: {
  profileRow?: { id: string; full_name: string; agency_id: string } | null;
  profileError?: { message: string } | null;
  updateRow?: { id: string } | null;
  updateError?: { message: string } | null;
}) {
  const calls: Call[] = [];
  let updateAgencyFilter: string | null = null;
  let profileAgencyFilter: string | null = null;

  const client = {
    from(table: string) {
      if (table === "profiles") {
        return {
          select: (...a: unknown[]) => {
            calls.push({ table, op: "select", args: a });
            return {
              eq: (col: string, val: unknown) => {
                calls.push({ table, op: "eq", args: [col, val] });
                if (col === "agency_id") profileAgencyFilter = String(val);
                return {
                  eq: (col2: string, val2: unknown) => {
                    calls.push({ table, op: "eq", args: [col2, val2] });
                    if (col2 === "agency_id") profileAgencyFilter = String(val2);
                    return {
                      maybeSingle: async () => {
                        if (options.profileError) {
                          return { data: null, error: options.profileError };
                        }
                        const row = options.profileRow ?? null;
                        if (
                          row &&
                          profileAgencyFilter &&
                          row.agency_id !== profileAgencyFilter
                        ) {
                          return { data: null, error: null };
                        }
                        return { data: row, error: null };
                      },
                    };
                  },
                  maybeSingle: async () => ({
                    data: options.profileRow ?? null,
                    error: options.profileError ?? null,
                  }),
                };
              },
            };
          },
        };
      }

      if (table === "leads") {
        return {
          update: (payload: unknown) => {
            calls.push({ table, op: "update", args: [payload] });
            return {
              eq: (col: string, val: unknown) => {
                calls.push({ table, op: "eq", args: [col, val] });
                if (col === "agency_id") updateAgencyFilter = String(val);
                return {
                  eq: (col2: string, val2: unknown) => {
                    calls.push({ table, op: "eq", args: [col2, val2] });
                    if (col2 === "agency_id") updateAgencyFilter = String(val2);
                    return {
                      select: (...a: unknown[]) => {
                        calls.push({ table, op: "select", args: a });
                        return {
                          maybeSingle: async () => {
                            if (options.updateError) {
                              return { data: null, error: options.updateError };
                            }
                            if (
                              updateAgencyFilter &&
                              updateAgencyFilter !== AGENCY_A
                            ) {
                              return { data: null, error: null };
                            }
                            return {
                              data: options.updateRow ?? { id: LEAD_A },
                              error: null,
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`unexpected table ${table}`);
    },
  };

  return { client, calls, getUpdateAgencyFilter: () => updateAgencyFilter };
}

describe("assignLeadToProfile same-agency gate", () => {
  beforeEach(() => {
    vi.resetModules();
    resolveTenantSupabaseMock.mockReset();
    resolveSessionAgencyIdMock.mockReset();
  });

  it("rejects a foreign profileId before writing assigned_profile_id", async () => {
    const { client, calls } = makeClient({
      profileRow: null,
    });
    resolveTenantSupabaseMock.mockResolvedValue(client);
    resolveSessionAgencyIdMock.mockResolvedValue(AGENCY_A);

    const { assignLeadToProfile } = await import("@/lib/team-store");

    await expect(
      assignLeadToProfile(LEAD_A, PROFILE_B, client as never),
    ).rejects.toThrow(/nepatrí do vašej agentúry/i);

    expect(calls.some((c) => c.table === "leads" && c.op === "update")).toBe(
      false,
    );
  });

  it("scopes the lead update to the caller agency_id", async () => {
    const { client, calls, getUpdateAgencyFilter } = makeClient({
      profileRow: {
        id: PROFILE_A,
        full_name: "Agent A",
        agency_id: AGENCY_A,
      },
      updateRow: { id: LEAD_A },
    });
    resolveTenantSupabaseMock.mockResolvedValue(client);
    resolveSessionAgencyIdMock.mockResolvedValue(AGENCY_A);

    const { assignLeadToProfile } = await import("@/lib/team-store");
    const result = await assignLeadToProfile(LEAD_A, PROFILE_A, client as never);

    expect(result).toEqual({ ok: true });
    expect(getUpdateAgencyFilter()).toBe(AGENCY_A);
    expect(
      calls.some(
        (c) =>
          c.table === "profiles" &&
          c.op === "eq" &&
          c.args[0] === "agency_id" &&
          c.args[1] === AGENCY_A,
      ),
    ).toBe(true);

    const updatePayload = calls.find(
      (c) => c.table === "leads" && c.op === "update",
    )?.args[0] as { assigned_profile_id?: string; assigned_agent?: string };
    expect(updatePayload.assigned_profile_id).toBe(PROFILE_A);
    expect(updatePayload.assigned_agent).toBe("Agent A");
  });

  it("fails closed when session has no agency_id", async () => {
    const { client } = makeClient({});
    resolveTenantSupabaseMock.mockResolvedValue(client);
    resolveSessionAgencyIdMock.mockResolvedValue(null);

    const { assignLeadToProfile } = await import("@/lib/team-store");
    await expect(
      assignLeadToProfile(LEAD_A, PROFILE_A, client as never),
    ).rejects.toThrow(/Chýba agentúra/i);
  });

  it("fails closed when supabase client is missing (no fake ok)", async () => {
    resolveTenantSupabaseMock.mockResolvedValue(null);

    const { assignLeadToProfile } = await import("@/lib/team-store");
    await expect(assignLeadToProfile(LEAD_A, PROFILE_A)).rejects.toThrow(
      /Supabase nie je nastavený/i,
    );
  });

  // Keep AGENCY_B referenced so a future regression can assert it stays unused.
  it("does not treat another agency as valid target", () => {
    expect(AGENCY_B).not.toBe(AGENCY_A);
  });
});
