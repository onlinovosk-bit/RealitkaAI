/**
 * The tenant gate on this route was `callerProfile?.agency_id && lead... !== ...`.
 *
 * That reads as a check and is not one. When the caller's profile carries no
 * agency the left side is falsy, the `&&` short-circuits, and the whole
 * comparison is skipped — so the request fell through to a service-role read of
 * any lead by id and pushed it to HubSpot. The damage is not a wrong status
 * code; it is another tenant's contact details leaving the system.
 *
 * So the assertion that matters here is not `403`. It is that
 * `syncLeadToHubSpot` was never called.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const CALLER_AGENCY = "aaaaaaaa-0000-0000-0000-000000000001";
const OTHER_AGENCY = "bbbbbbbb-0000-0000-0000-000000000002";

const mockGetUser = vi.hoisted(() => vi.fn());
const mockCallerProfile = vi.hoisted(() => vi.fn());
const mockLead = vi.hoisted(() => vi.fn());
const mockSync = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mockCallerProfile }) }),
    }),
  }),
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: mockLead }) }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  }),
}));

vi.mock("@/lib/hubspot/sync", () => ({
  syncLeadToHubSpot: (...a: unknown[]) => mockSync(...a),
}));

const post = async () => {
  const { POST } = await import("../route");
  return POST(new Request("http://localhost/api/integrations/hubspot/sync", {
    method: "POST",
    body: JSON.stringify({ leadId: "lead-1" }),
  }));
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "auth-1" } } });
  mockSync.mockResolvedValue({ ok: true, contactId: "hs-1", dealId: null });
});

describe("hubspot sync — tenant gate is fail-closed", () => {
  it("a caller with NO agency cannot push any lead", async () => {
    mockCallerProfile.mockResolvedValue({ data: { agency_id: null } });
    mockLead.mockResolvedValue({ data: { id: "lead-1", agency_id: OTHER_AGENCY }, error: null });

    const res = await post();

    expect(res.status).toBe(403);
    expect(mockSync).not.toHaveBeenCalled();
  });

  it("a caller whose profile row is missing entirely cannot push any lead", async () => {
    mockCallerProfile.mockResolvedValue({ data: null });
    mockLead.mockResolvedValue({ data: { id: "lead-1", agency_id: OTHER_AGENCY }, error: null });

    const res = await post();

    expect(res.status).toBe(403);
    expect(mockSync).not.toHaveBeenCalled();
  });

  it("a caller with an agency still cannot push another agency's lead", async () => {
    mockCallerProfile.mockResolvedValue({ data: { agency_id: CALLER_AGENCY } });
    mockLead.mockResolvedValue({ data: { id: "lead-1", agency_id: OTHER_AGENCY }, error: null });

    const res = await post();

    expect(res.status).toBe(403);
    expect(mockSync).not.toHaveBeenCalled();
  });

  it("a caller pushing their own agency's lead is allowed", async () => {
    mockCallerProfile.mockResolvedValue({ data: { agency_id: CALLER_AGENCY } });
    mockLead.mockResolvedValue({ data: { id: "lead-1", agency_id: CALLER_AGENCY }, error: null });

    const res = await post();

    expect(res.status).toBe(200);
    expect(mockSync).toHaveBeenCalledTimes(1);
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
