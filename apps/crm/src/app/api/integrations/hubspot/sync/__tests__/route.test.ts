import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profileMaybeSingle: vi.fn(),
  leadSingle: vi.fn(),
  createAdminClient: vi.fn(),
  syncLeadToHubSpot: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => mocks.getUser() },
    from: (table: string) => {
      if (table !== "profiles") throw new Error(`unexpected auth table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => mocks.profileMaybeSingle(),
          }),
        }),
      };
    },
  }),
  createAdminClient: () => mocks.createAdminClient(),
}));

vi.mock("@/lib/hubspot/sync", () => ({
  syncLeadToHubSpot: (...args: unknown[]) => mocks.syncLeadToHubSpot(...args),
}));

import { POST } from "../route";

const LEAD_A = {
  id: "11111111-1111-4111-8111-111111111111",
  agency_id: "agency-a",
  name: "Lead A",
  email: "a@example.com",
};

function request(leadId: string) {
  return new Request("http://localhost/api/integrations/hubspot/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ leadId }),
  });
}

describe("POST /api/integrations/hubspot/sync tenant gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.profileMaybeSingle.mockResolvedValue({
      data: { agency_id: "agency-a" },
      error: null,
    });
    mocks.leadSingle.mockResolvedValue({ data: LEAD_A, error: null });
    mocks.createAdminClient.mockReturnValue({
      from: (table: string) => {
        if (table !== "leads") throw new Error(`unexpected admin table ${table}`);
        return {
          select: () => ({
            eq: () => ({
              single: () => mocks.leadSingle(),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      },
    });
    mocks.syncLeadToHubSpot.mockResolvedValue({
      ok: true,
      contactId: "hs-1",
      dealId: null,
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(request(LEAD_A.id));

    expect(res.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.syncLeadToHubSpot).not.toHaveBeenCalled();
  });

  it("returns 403 when caller has no agency_id (fail-closed IDOR)", async () => {
    mocks.profileMaybeSingle.mockResolvedValue({ data: { agency_id: null }, error: null });

    const res = await POST(request(LEAD_A.id));

    expect(res.status).toBe(403);
    expect(mocks.syncLeadToHubSpot).not.toHaveBeenCalled();
  });

  it("returns 403 when lead belongs to another agency", async () => {
    mocks.leadSingle.mockResolvedValue({
      data: { ...LEAD_A, agency_id: "agency-b" },
      error: null,
    });

    const res = await POST(request(LEAD_A.id));

    expect(res.status).toBe(403);
    expect(mocks.syncLeadToHubSpot).not.toHaveBeenCalled();
  });

  it("syncs when caller agency matches lead agency", async () => {
    const res = await POST(request(LEAD_A.id));

    expect(res.status).toBe(200);
    expect(mocks.syncLeadToHubSpot).toHaveBeenCalledOnce();
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      contactId: "hs-1",
    });
  });
});
