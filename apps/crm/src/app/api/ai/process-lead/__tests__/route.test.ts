import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

const mocks = vi.hoisted(() => ({
  isEnabled: vi.fn(),
  getCurrentProfile: vi.fn(),
  checkAiRateLimit: vi.fn(),
  fetchLeadAgencyId: vi.fn(),
  runPipeline: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/lib/enterprise-sales-intelligence-gate", () => ({
  isEnterpriseSalesIntelligenceEnabled: mocks.isEnabled,
}));
vi.mock("@/lib/auth", () => ({ getCurrentProfile: mocks.getCurrentProfile }));
vi.mock("@/lib/ai/rate-guard", () => ({ checkAiRateLimit: mocks.checkAiRateLimit }));
vi.mock("@/lib/db/enterprise-intelligence-store", () => ({
  fetchLeadAgencyId: mocks.fetchLeadAgencyId,
  runEnterprisePipelineAndPersist: mocks.runPipeline,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002";

function postRequest() {
  return new Request("http://localhost/api/ai/process-lead", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ leadId: "lead-1" }),
  });
}

describe("POST /api/ai/process-lead — tenant brana", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isEnabled.mockResolvedValue(true);
    mocks.getCurrentProfile.mockResolvedValue({
      id: "p-1",
      auth_user_id: "auth-1",
      agency_id: AGENCY_A,
    });
    mocks.checkAiRateLimit.mockResolvedValue(null);
    mocks.fetchLeadAgencyId.mockResolvedValue({ found: true, agencyId: AGENCY_A });
    mocks.runPipeline.mockResolvedValue({
      score: 1, risk: "low", isHot: false, action: null, dna: null,
    });
    mocks.createClient.mockResolvedValue({});
  });

  it("volajuci BEZ agentury nespusti pipeline nad ziadnym leadom", async () => {
    mocks.getCurrentProfile.mockResolvedValue({
      id: "p-1", auth_user_id: "auth-1", agency_id: null,
    });
    mocks.fetchLeadAgencyId.mockResolvedValue({ found: true, agencyId: AGENCY_B });

    const res = await POST(postRequest());

    expect(res.status).toBe(403);
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("lead bez agentury sa uz nespracuje pod agenturou volajuceho", async () => {
    mocks.fetchLeadAgencyId.mockResolvedValue({ found: true, agencyId: null });

    const res = await POST(postRequest());

    expect(res.status).toBe(403);
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("volajuci s agenturou stale nespusti pipeline nad cudzim leadom", async () => {
    mocks.fetchLeadAgencyId.mockResolvedValue({ found: true, agencyId: AGENCY_B });

    const res = await POST(postRequest());

    expect(res.status).toBe(403);
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("volajuci spusti pipeline nad vlastnym leadom s vlastnou agenturou", async () => {
    const res = await POST(postRequest());

    expect(res.status).toBe(200);
    expect(mocks.runPipeline).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: "lead-1", agencyId: AGENCY_A }),
    );
  });
});
