import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profileMaybeSingle: vi.fn(),
  leadMaybeSingle: vi.fn(),
  deleteLead: vi.fn(),
  getLead: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => mocks.getUser() },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => mocks.profileMaybeSingle() }) }),
        };
      }
      if (table === "leads") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => mocks.leadMaybeSingle() }) }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
  createAdminClient: () => ({}),
}));

vi.mock("@/lib/leads-store", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    deleteLead: (...args: unknown[]) => mocks.deleteLead(...args),
    getLead: (...args: unknown[]) => mocks.getLead(...args),
  };
});

import { DELETE } from "../route";

const LEAD_ID = "33333333-3333-4333-8333-333333333333";

function params() {
  return { params: Promise.resolve({ id: LEAD_ID }) };
}

/**
 * DELETE je z celej fail-open sady najdrahší omyl: nie čítanie cudzích dát,
 * ale ich zmazanie. Preto má vlastný test, nie len kontrolu vzoru v súbore.
 */
describe("DELETE /api/leads/[id] tenant gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.deleteLead.mockResolvedValue(undefined);
    mocks.getLead.mockResolvedValue({ id: LEAD_ID, name: "Lead" });
  });

  it("nezmaže cudzí lead, keď volajúci nemá agency_id", async () => {
    mocks.profileMaybeSingle.mockResolvedValue({ data: { agency_id: null, id: "p1" } });
    mocks.leadMaybeSingle.mockResolvedValue({ data: { agency_id: "agency-b" } });

    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), params());

    expect(res.status).toBe(403);
    expect(mocks.deleteLead).not.toHaveBeenCalled();
  });

  it("nezmaže lead inej agentúry", async () => {
    mocks.profileMaybeSingle.mockResolvedValue({ data: { agency_id: "agency-a", id: "p1" } });
    mocks.leadMaybeSingle.mockResolvedValue({ data: { agency_id: "agency-b" } });

    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), params());

    expect(res.status).toBe(403);
    expect(mocks.deleteLead).not.toHaveBeenCalled();
  });

  it("nezmaže lead bez agency_id (nepriradený riadok nie je ničí)", async () => {
    mocks.profileMaybeSingle.mockResolvedValue({ data: { agency_id: "agency-a", id: "p1" } });
    mocks.leadMaybeSingle.mockResolvedValue({ data: { agency_id: null } });

    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), params());

    expect(res.status).toBe(403);
    expect(mocks.deleteLead).not.toHaveBeenCalled();
  });

  it("zmaže vlastný lead", async () => {
    mocks.profileMaybeSingle.mockResolvedValue({ data: { agency_id: "agency-a", id: "p1" } });
    mocks.leadMaybeSingle.mockResolvedValue({ data: { agency_id: "agency-a" } });

    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), params());

    expect(res.status).toBe(200);
    expect(mocks.deleteLead).toHaveBeenCalledTimes(1);
  });
});
