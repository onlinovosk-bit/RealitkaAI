import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

vi.mock("@/lib/ai/rate-guard", () => ({
  checkAiRateLimit: vi.fn(async () => null),
}));

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/lead-automation-store", () => ({
  listAssignmentRules: (...args: unknown[]) => mockList(...args),
  createAssignmentRule: (...args: unknown[]) => mockCreate(...args),
  updateAssignmentRule: (...args: unknown[]) => mockUpdate(...args),
  deleteAssignmentRule: (...args: unknown[]) => mockDelete(...args),
}));

import { GET, POST } from "@/app/api/automation/rules/route";
import { DELETE, PATCH } from "@/app/api/automation/rules/[id]/route";

const AGENCY_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const AGENCY_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const RULE_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function profileQuery(agencyId: string | null) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: agencyId ? { agency_id: agencyId } : { agency_id: null } }),
      }),
    }),
  };
}

function ruleQuery(row: { id: string; agency_id: string } | null, error: { message: string } | null = null) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: row, error }),
      }),
    }),
  };
}

describe("automation rules tenant gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue({ id: "new" });
    mockUpdate.mockResolvedValue({ id: RULE_B });
    mockDelete.mockResolvedValue(undefined);
  });

  it("GET refuses callers without agency_id", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return profileQuery(null);
      throw new Error(`unexpected ${table}`);
    });
    const res = await GET();
    expect(res.status).toBe(403);
    expect(mockList).not.toHaveBeenCalled();
  });

  it("GET lists only via caller agencyId", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return profileQuery(AGENCY_A);
      throw new Error(`unexpected ${table}`);
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockList).toHaveBeenCalledWith(AGENCY_A, expect.anything());
  });

  it("POST stamps caller agencyId (ignores body.agencyId)", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return profileQuery(AGENCY_A);
      throw new Error(`unexpected ${table}`);
    });
    const res = await POST(
      new Request("http://localhost/api/automation/rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "X",
          ruleType: "location",
          profileIds: [],
          agencyId: AGENCY_B,
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId: AGENCY_A, name: "X" }),
      expect.anything(),
    );
  });

  it("DELETE fails closed when rule belongs to another agency", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return profileQuery(AGENCY_A);
      if (table === "lead_assignment_rules") {
        return ruleQuery({ id: RULE_B, agency_id: AGENCY_B });
      }
      throw new Error(`unexpected ${table}`);
    });
    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: RULE_B }),
    });
    expect(res.status).toBe(403);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("DELETE fails closed when rule is missing (no demo ok)", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return profileQuery(AGENCY_A);
      if (table === "lead_assignment_rules") return ruleQuery(null);
      throw new Error(`unexpected ${table}`);
    });
    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: RULE_B }),
    });
    expect(res.status).toBe(404);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("PATCH allows same-agency rule", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return profileQuery(AGENCY_A);
      if (table === "lead_assignment_rules") {
        return ruleQuery({ id: RULE_B, agency_id: AGENCY_A });
      }
      throw new Error(`unexpected ${table}`);
    });
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Renamed" }),
      }),
      { params: Promise.resolve({ id: RULE_B }) },
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      RULE_B,
      AGENCY_A,
      expect.objectContaining({ name: "Renamed" }),
      expect.anything(),
    );
  });
});
