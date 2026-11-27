import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  getProperty: vi.fn(),
  updateProperty: vi.fn(),
  deleteProperty: vi.fn(),
  createProperty: vi.fn(),
  listProperties: vi.fn(),
  checkAiRateLimit: vi.fn(async () => null),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/ai/rate-guard", () => ({ checkAiRateLimit: mocks.checkAiRateLimit }));
vi.mock("@/lib/properties-store", () => ({
  createProperty: mocks.createProperty,
  listProperties: mocks.listProperties,
  getProperty: mocks.getProperty,
  updateProperty: mocks.updateProperty,
  deleteProperty: mocks.deleteProperty,
}));

const USER = { id: "auth-user-1" };
const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002";
const PROPERTY_ID = "cccccccc-cccc-4ccc-8ccc-cccccccc0003";

function callerAgency(agencyId: string | null, missingRow = false) {
  mocks.maybeSingle.mockResolvedValue({
    data: missingRow ? null : { agency_id: agencyId },
  });
}

describe("/api/properties PUT/DELETE — session agency scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: USER } });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
      }),
    });
    mocks.updateProperty.mockResolvedValue({ id: PROPERTY_ID, title: "x" });
    mocks.deleteProperty.mockResolvedValue(undefined);
  });

  it("PUT refuses missing caller agency (fail-closed)", async () => {
    callerAgency(null);
    mocks.getProperty.mockResolvedValue({
      id: PROPERTY_ID,
      agencyId: AGENCY_A,
      title: "Byt",
    });
    const { PUT } = await import("../route");
    const res = await PUT(
      new Request("http://localhost/api/properties", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: PROPERTY_ID, title: "Hack" }),
      }),
    );
    expect(res.status).toBe(403);
    expect(mocks.updateProperty).not.toHaveBeenCalled();
  });

  it("PUT refuses sibling-tenant property id (multi-agency RLS class)", async () => {
    callerAgency(AGENCY_A);
    // Store already session-scopes; sibling id looks like "not found".
    mocks.getProperty.mockResolvedValue(undefined);
    const { PUT } = await import("../route");
    const res = await PUT(
      new Request("http://localhost/api/properties", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: PROPERTY_ID, title: "Cross-tenant", price: 1 }),
      }),
    );
    expect(res.status).toBe(403);
    expect(mocks.updateProperty).not.toHaveBeenCalled();
  });

  it("PUT updates when property belongs to session agency", async () => {
    callerAgency(AGENCY_A);
    mocks.getProperty.mockResolvedValue({
      id: PROPERTY_ID,
      agencyId: AGENCY_A,
      title: "Byt",
    });
    const { PUT } = await import("../route");
    const res = await PUT(
      new Request("http://localhost/api/properties", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: PROPERTY_ID, title: "Novy", price: 120000 }),
      }),
    );
    expect(res.status).toBe(200);
    expect(mocks.updateProperty).toHaveBeenCalledWith(
      PROPERTY_ID,
      { title: "Novy", price: 120000 },
      expect.anything(),
    );
  });

  it("DELETE refuses property from another agency", async () => {
    callerAgency(AGENCY_A);
    mocks.getProperty.mockResolvedValue({
      id: PROPERTY_ID,
      agencyId: AGENCY_B,
      title: "Cudzia",
    });
    const { DELETE } = await import("../route");
    const res = await DELETE(
      new Request("http://localhost/api/properties", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: PROPERTY_ID }),
      }),
    );
    expect(res.status).toBe(403);
    expect(mocks.deleteProperty).not.toHaveBeenCalled();
  });

  it("DELETE removes same-agency property", async () => {
    callerAgency(AGENCY_A);
    mocks.getProperty.mockResolvedValue({
      id: PROPERTY_ID,
      agencyId: AGENCY_A,
      title: "Byt",
    });
    const { DELETE } = await import("../route");
    const res = await DELETE(
      new Request("http://localhost/api/properties", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: PROPERTY_ID }),
      }),
    );
    expect(res.status).toBe(200);
    expect(mocks.deleteProperty).toHaveBeenCalledWith(PROPERTY_ID, expect.anything());
  });
});
