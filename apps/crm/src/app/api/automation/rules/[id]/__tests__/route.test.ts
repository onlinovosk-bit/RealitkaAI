import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH, DELETE } from "../route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  ruleRow: vi.fn(),
  profileRow: vi.fn(),
  updateAssignmentRule: vi.fn(),
  deleteAssignmentRule: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/lead-automation-store", () => ({
  updateAssignmentRule: mocks.updateAssignmentRule,
  deleteAssignmentRule: mocks.deleteAssignmentRule,
}));

const USER = { id: "auth-user-1" };
const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002";

function patchRequest() {
  return new Request("http://localhost/api/automation/rules/rule-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Prepisane pravidlo" }),
  });
}

function deleteRequest() {
  return new Request("http://localhost/api/automation/rules/rule-1", { method: "DELETE" });
}

const params = Promise.resolve({ id: "rule-1" });

describe("/api/automation/rules/[id] — tenant brana", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: USER } });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            maybeSingle:
              table === "profiles" ? mocks.profileRow : mocks.ruleRow,
          }),
        }),
      }),
    });
    mocks.profileRow.mockResolvedValue({ data: { agency_id: AGENCY_A } });
    mocks.ruleRow.mockResolvedValue({ data: { agency_id: AGENCY_A } });
    mocks.updateAssignmentRule.mockResolvedValue({ id: "rule-1", name: "Prepisane pravidlo" });
    mocks.deleteAssignmentRule.mockResolvedValue(undefined);
  });

  it("PATCH: volajuci BEZ agentury nemoze upravit ziadne pravidlo", async () => {
    mocks.profileRow.mockResolvedValue({ data: { agency_id: null } });
    const res = await PATCH(patchRequest(), { params });
    expect(res.status).toBe(403);
    expect(mocks.updateAssignmentRule).not.toHaveBeenCalled();
  });

  it("PATCH: pravidlo bez agentury sa uz neda upravit nikym", async () => {
    mocks.ruleRow.mockResolvedValue({ data: { agency_id: null } });
    const res = await PATCH(patchRequest(), { params });
    expect(res.status).toBe(403);
    expect(mocks.updateAssignmentRule).not.toHaveBeenCalled();
  });

  it("PATCH: volajuci s agenturou stale nemoze upravit cudzie pravidlo", async () => {
    mocks.ruleRow.mockResolvedValue({ data: { agency_id: AGENCY_B } });
    const res = await PATCH(patchRequest(), { params });
    expect(res.status).toBe(403);
    expect(mocks.updateAssignmentRule).not.toHaveBeenCalled();
  });

  it("PATCH: volajuci upravi vlastne pravidlo", async () => {
    const res = await PATCH(patchRequest(), { params });
    expect(res.status).toBe(200);
    expect(mocks.updateAssignmentRule).toHaveBeenCalledTimes(1);
  });

  it("DELETE: volajuci BEZ agentury nemoze zmazat ziadne pravidlo", async () => {
    mocks.profileRow.mockResolvedValue({ data: { agency_id: null } });
    const res = await DELETE(deleteRequest(), { params });
    expect(res.status).toBe(403);
    expect(mocks.deleteAssignmentRule).not.toHaveBeenCalled();
  });

  it("DELETE: volajuci s agenturou stale nemoze zmazat cudzie pravidlo", async () => {
    mocks.ruleRow.mockResolvedValue({ data: { agency_id: AGENCY_B } });
    const res = await DELETE(deleteRequest(), { params });
    expect(res.status).toBe(403);
    expect(mocks.deleteAssignmentRule).not.toHaveBeenCalled();
  });
});
