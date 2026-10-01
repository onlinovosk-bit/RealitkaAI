import { beforeEach, describe, expect, it, vi } from "vitest";

const scoped = { __scoped: true, auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { agency_id: "ag-1" } }) }) }) }) };

const createPropertyMock = vi.fn();
const getPropertyMock = vi.fn();
const getLeadByIdMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => scoped }));
vi.mock("@/lib/ai/rate-guard", () => ({ checkAiRateLimit: async () => null }));
vi.mock("@/lib/properties-store", () => ({
  createProperty: (...a: unknown[]) => createPropertyMock(...a),
  listProperties: async () => [],
  getProperty: (...a: unknown[]) => getPropertyMock(...a),
}));
vi.mock("@/lib/leads-store", () => ({
  getLeadById: (...a: unknown[]) => getLeadByIdMock(...a),
  logMatchingActivity: async () => undefined,
}));
vi.mock("@/lib/matching", () => ({ calculatePropertyMatch: () => ({ score: 80, reasons: [] }) }));

beforeEach(() => vi.clearAllMocks());

describe("POST /api/properties", () => {
  it("passes the request-scoped client and returns the {ok:true} contract the create form checks", async () => {
    createPropertyMock.mockResolvedValue({ id: "p1", title: "Byt" });
    const { POST } = await import("../route");
    const res = await POST(new Request("http://x/api/properties", { method: "POST", body: JSON.stringify({ title: "Byt" }) }));
    const body = await res.json();
    expect(createPropertyMock.mock.calls[0][1]).toBe(scoped);
    expect(body.ok).toBe(true);
    expect(body.property.id).toBe("p1");
  });

  it("returns ok:false with an error on failure", async () => {
    createPropertyMock.mockRejectedValue(new Error("RLS"));
    const { POST } = await import("../route");
    const res = await POST(new Request("http://x/api/properties", { method: "POST", body: JSON.stringify({ title: "Byt" }) }));
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });
});

describe("POST /api/matching/action", () => {
  it("passes the scoped client to getProperty and getLeadById", async () => {
    getPropertyMock.mockResolvedValue(undefined);
    getLeadByIdMock.mockResolvedValue(undefined);
    const { POST } = await import("@/app/api/matching/action/route");
    await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ leadId: "l1", propertyId: "p1" }) }));
    expect(getPropertyMock).toHaveBeenCalledWith("p1", scoped);
    expect(getLeadByIdMock).toHaveBeenCalledWith("l1", scoped);
  });
});
