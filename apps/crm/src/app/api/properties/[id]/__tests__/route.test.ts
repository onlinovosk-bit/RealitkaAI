import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH, DELETE } from "../route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  getProperty: vi.fn(),
  updateProperty: vi.fn(),
  deleteProperty: vi.fn(),
  createActivity: vi.fn(),
  autoRecalculateForProperty: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/properties-store", () => ({
  getProperty: mocks.getProperty,
  updateProperty: mocks.updateProperty,
  deleteProperty: mocks.deleteProperty,
}));
vi.mock("@/lib/activities-store", () => ({ createActivity: mocks.createActivity }));
vi.mock("@/lib/matching-hooks", () => ({
  autoRecalculateForProperty: mocks.autoRecalculateForProperty,
}));

const USER = { id: "auth-user-1" };
const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002";
const PROPERTY_ID = "cccccccc-cccc-4ccc-8ccc-cccccccc0003";

function callerAgency(agencyId: string | null, missingRow = false) {
  mocks.maybeSingle.mockResolvedValue({ data: missingRow ? null : { agency_id: agencyId } });
}

function patchRequest() {
  return new Request(`http://localhost/api/properties/${PROPERTY_ID}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Prepisany titulok" }),
  });
}

function deleteRequest() {
  return new Request(`http://localhost/api/properties/${PROPERTY_ID}`, { method: "DELETE" });
}

const params = Promise.resolve({ id: PROPERTY_ID });

describe("/api/properties/[id] — tenant brana", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: USER } });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
      }),
    });
    mocks.getProperty.mockResolvedValue({
      id: PROPERTY_ID,
      title: "Povodny",
      agencyId: AGENCY_A,
    });
    mocks.updateProperty.mockResolvedValue({ id: PROPERTY_ID, title: "Prepisany titulok" });
    mocks.deleteProperty.mockResolvedValue(undefined);
    mocks.createActivity.mockResolvedValue(undefined);
    mocks.autoRecalculateForProperty.mockResolvedValue(undefined);
  });

  it("PATCH: volajuci BEZ agentury nemoze upravit ziadnu nehnutelnost", async () => {
    callerAgency(null);
    const res = await PATCH(patchRequest(), { params });
    expect(res.status).toBe(403);
    expect(mocks.updateProperty).not.toHaveBeenCalled();
  });

  it("PATCH: nehnutelnost BEZ agentury sa uz neda upravit nikym", async () => {
    callerAgency(AGENCY_A);
    mocks.getProperty.mockResolvedValue({ id: PROPERTY_ID, title: "Sirota", agencyId: null });
    const res = await PATCH(patchRequest(), { params });
    expect(res.status).toBe(403);
    expect(mocks.updateProperty).not.toHaveBeenCalled();
  });

  it("PATCH: volajuci s agenturou stale nemoze upravit cudziu nehnutelnost", async () => {
    callerAgency(AGENCY_A);
    mocks.getProperty.mockResolvedValue({ id: PROPERTY_ID, title: "Cudzia", agencyId: AGENCY_B });
    const res = await PATCH(patchRequest(), { params });
    expect(res.status).toBe(403);
    expect(mocks.updateProperty).not.toHaveBeenCalled();
  });

  it("PATCH: volajuci upravi vlastnu nehnutelnost", async () => {
    callerAgency(AGENCY_A);
    const res = await PATCH(patchRequest(), { params });
    expect(res.status).toBe(200);
    expect(mocks.updateProperty).toHaveBeenCalledTimes(1);
  });

  it("DELETE: volajuci BEZ agentury nemoze zmazat ziadnu nehnutelnost", async () => {
    callerAgency(null);
    const res = await DELETE(deleteRequest(), { params });
    expect(res.status).toBe(403);
    expect(mocks.deleteProperty).not.toHaveBeenCalled();
  });

  it("DELETE: volajuci s agenturou stale nemoze zmazat cudziu nehnutelnost", async () => {
    callerAgency(AGENCY_A);
    mocks.getProperty.mockResolvedValue({ id: PROPERTY_ID, title: "Cudzia", agencyId: AGENCY_B });
    const res = await DELETE(deleteRequest(), { params });
    expect(res.status).toBe(403);
    expect(mocks.deleteProperty).not.toHaveBeenCalled();
  });

  it("DELETE: volajuci zmaze vlastnu nehnutelnost", async () => {
    callerAgency(AGENCY_A);
    const res = await DELETE(deleteRequest(), { params });
    expect(res.status).toBe(200);
    expect(mocks.deleteProperty).toHaveBeenCalledTimes(1);
  });
});
