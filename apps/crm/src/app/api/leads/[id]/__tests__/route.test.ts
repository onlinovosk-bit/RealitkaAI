import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH, DELETE } from "../route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  profileRow: vi.fn(),
  leadRow: vi.fn(),
  getLead: vi.fn(),
  updateLead: vi.fn(),
  deleteLead: vi.fn(),
  createActivity: vi.fn(),
  autoRecalculateForLead: vi.fn(),
  rescoreLead: vi.fn(),
  notifyHotLead: vi.fn(),
  publish: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/leads-store", () => ({
  getLead: mocks.getLead,
  updateLead: mocks.updateLead,
  deleteLead: mocks.deleteLead,
}));
vi.mock("@/lib/activities-store", () => ({ createActivity: mocks.createActivity }));
vi.mock("@/lib/matching-hooks", () => ({ autoRecalculateForLead: mocks.autoRecalculateForLead }));
vi.mock("@/lib/rescore-lead", () => ({ rescoreLead: mocks.rescoreLead }));
vi.mock("@/services/push/PushNotificationService", () => ({ notifyHotLead: mocks.notifyHotLead }));
vi.mock("@/infra/messaging/EventBus", () => ({
  globalEventBus: { publish: mocks.publish, subscribe: vi.fn() },
}));

const USER = { id: "auth-user-1" };
const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002";
const LEAD_ID = "dddddddd-dddd-4ddd-8ddd-dddddddd0004";

function patchRequest() {
  return new Request(`http://localhost/api/leads/${LEAD_ID}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Prepisane meno" }),
  });
}

function deleteRequest() {
  return new Request(`http://localhost/api/leads/${LEAD_ID}`, { method: "DELETE" });
}

const params = Promise.resolve({ id: LEAD_ID });

describe("/api/leads/[id] — tenant brana", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: USER } });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: table === "profiles" ? mocks.profileRow : mocks.leadRow,
          }),
        }),
      }),
    });
    mocks.profileRow.mockResolvedValue({ data: { agency_id: AGENCY_A } });
    mocks.leadRow.mockResolvedValue({ data: { agency_id: AGENCY_A, created_at: null } });
    mocks.getLead.mockResolvedValue({ id: LEAD_ID, name: "Klient", status: "Novy" });
    mocks.updateLead.mockResolvedValue({ id: LEAD_ID, name: "Prepisane meno", status: "Novy" });
    mocks.deleteLead.mockResolvedValue(undefined);
    mocks.createActivity.mockResolvedValue(undefined);
    mocks.autoRecalculateForLead.mockResolvedValue(undefined);
    mocks.rescoreLead.mockResolvedValue(undefined);
  });

  it("PATCH: volajuci BEZ agentury nemoze upravit ziadny lead", async () => {
    mocks.profileRow.mockResolvedValue({ data: { agency_id: null } });
    const res = await PATCH(patchRequest(), { params });
    expect(res.status).toBe(403);
    expect(mocks.updateLead).not.toHaveBeenCalled();
  });

  it("PATCH: volajuci bez profiloveho riadku nemoze upravit ziadny lead", async () => {
    mocks.profileRow.mockResolvedValue({ data: null });
    const res = await PATCH(patchRequest(), { params });
    expect(res.status).toBe(403);
    expect(mocks.updateLead).not.toHaveBeenCalled();
  });

  it("PATCH: volajuci s agenturou stale nemoze upravit cudzi lead", async () => {
    mocks.leadRow.mockResolvedValue({ data: { agency_id: AGENCY_B, created_at: null } });
    const res = await PATCH(patchRequest(), { params });
    expect(res.status).toBe(403);
    expect(mocks.updateLead).not.toHaveBeenCalled();
  });

  it("PATCH: volajuci upravi vlastny lead", async () => {
    const res = await PATCH(patchRequest(), { params });
    expect(res.status).toBe(200);
    expect(mocks.updateLead).toHaveBeenCalledTimes(1);
  });

  it("DELETE: volajuci BEZ agentury nemoze zmazat ziadny lead", async () => {
    mocks.profileRow.mockResolvedValue({ data: { agency_id: null } });
    const res = await DELETE(deleteRequest(), { params });
    expect(res.status).toBe(403);
    expect(mocks.deleteLead).not.toHaveBeenCalled();
  });

  it("DELETE: volajuci s agenturou stale nemoze zmazat cudzi lead", async () => {
    mocks.leadRow.mockResolvedValue({ data: { agency_id: AGENCY_B } });
    const res = await DELETE(deleteRequest(), { params });
    expect(res.status).toBe(403);
    expect(mocks.deleteLead).not.toHaveBeenCalled();
  });

  it("DELETE: volajuci zmaze vlastny lead", async () => {
    const res = await DELETE(deleteRequest(), { params });
    expect(res.status).toBe(200);
    expect(mocks.deleteLead).toHaveBeenCalledTimes(1);
  });
});
