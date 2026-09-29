import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

const mocks = vi.hoisted(() => ({
  isEnabled: vi.fn(),
  getCurrentProfile: vi.fn(),
  fetchLeadAgencyId: vi.fn(),
  createClient: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/enterprise-sales-intelligence-gate", () => ({
  isEnterpriseSalesIntelligenceEnabled: mocks.isEnabled,
}));
vi.mock("@/lib/auth", () => ({ getCurrentProfile: mocks.getCurrentProfile }));
vi.mock("@/lib/db/enterprise-intelligence-store", () => ({
  fetchLeadAgencyId: mocks.fetchLeadAgencyId,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002";

function postRequest(body: Record<string, unknown> = { leadId: "lead-1", type: "call" }) {
  return new Request("http://localhost/api/ai/lead-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai/lead-events — tenant brana", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isEnabled.mockResolvedValue(true);
    mocks.getCurrentProfile.mockResolvedValue({ id: "p-1", agency_id: AGENCY_A });
    mocks.fetchLeadAgencyId.mockResolvedValue({ found: true, agencyId: AGENCY_A });
    mocks.insert.mockReturnValue({
      select: () => ({ single: async () => ({ data: { id: "ev-1", created_at: "x" }, error: null }) }),
    });
    mocks.createClient.mockResolvedValue({ from: () => ({ insert: mocks.insert }) });
  });

  it("volajuci BEZ agentury nezapise udalost k ziadnemu leadu", async () => {
    mocks.getCurrentProfile.mockResolvedValue({ id: "p-1", agency_id: null });
    mocks.fetchLeadAgencyId.mockResolvedValue({ found: true, agencyId: AGENCY_B });

    const res = await POST(postRequest());

    expect(res.status).toBe(403);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("lead bez agentury sa uz neopeciatkuje agenturou volajuceho", async () => {
    mocks.fetchLeadAgencyId.mockResolvedValue({ found: true, agencyId: null });

    const res = await POST(postRequest());

    expect(res.status).toBe(403);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("volajuci s agenturou stale nezapise udalost k cudziemu leadu", async () => {
    mocks.fetchLeadAgencyId.mockResolvedValue({ found: true, agencyId: AGENCY_B });

    const res = await POST(postRequest());

    expect(res.status).toBe(403);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("volajuci zapise udalost k vlastnemu leadu, opeciatkovanu vlastnou agenturou", async () => {
    const res = await POST(postRequest());

    expect(res.status).toBe(200);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ agency_id: AGENCY_A, lead_id: "lead-1" }),
    );
  });
});
