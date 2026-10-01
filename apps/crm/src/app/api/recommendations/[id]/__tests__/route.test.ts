import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "../route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  profileRow: vi.fn(),
  leadRow: vi.fn(),
  getAiRecommendationById: vi.fn(),
  updateAiRecommendation: vi.fn(),
  getLeadById: vi.fn(),
  addLeadActivity: vi.fn(),
  sendOnboardingEmail: vi.fn(),
  captureAiRecommendationReaction: vi.fn(),
  hashRecommendationDedupePart: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/leads-store", () => ({
  getAiRecommendationById: mocks.getAiRecommendationById,
  updateAiRecommendation: mocks.updateAiRecommendation,
  getLeadById: mocks.getLeadById,
  addLeadActivity: mocks.addLeadActivity,
}));
vi.mock("@/lib/send-onboarding-email", () => ({
  sendOnboardingEmail: mocks.sendOnboardingEmail,
}));
vi.mock("@/lib/moat-capture/log-ai-recommendation", () => ({
  captureAiRecommendationReaction: mocks.captureAiRecommendationReaction,
  hashRecommendationDedupePart: mocks.hashRecommendationDedupePart,
}));

const USER = { id: "auth-user-1" };
const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002";

function patchRequest() {
  return new Request("http://localhost/api/recommendations/rec-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "inactive" }),
  });
}

const params = Promise.resolve({ id: "rec-1" });

describe("PATCH /api/recommendations/[id] — tenant brana", () => {
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
    mocks.leadRow.mockResolvedValue({ data: { agency_id: AGENCY_A } });
    mocks.getAiRecommendationById.mockResolvedValue({
      id: "rec-1",
      leadId: "lead-1",
      title: "Zavolaj klientovi",
      description: "",
      priority: "high",
      status: "active",
    });
    mocks.updateAiRecommendation.mockResolvedValue({
      id: "rec-1",
      leadId: "lead-1",
      title: "Zavolaj klientovi",
      description: "",
      priority: "high",
      status: "inactive",
    });
    mocks.getLeadById.mockResolvedValue({ id: "lead-1", name: "Klient", email: "" });
    mocks.addLeadActivity.mockResolvedValue(undefined);
    mocks.hashRecommendationDedupePart.mockReturnValue("hash");
  });

  it("volajuci BEZ agentury nemoze upravit ziadne odporucanie", async () => {
    mocks.profileRow.mockResolvedValue({ data: { agency_id: null } });

    const res = await PATCH(patchRequest(), { params });

    expect(res.status).toBe(403);
    expect(mocks.updateAiRecommendation).not.toHaveBeenCalled();
  });

  it("odporucanie bez leadId sa uz neda upravit naslepo", async () => {
    mocks.getAiRecommendationById.mockResolvedValue({
      id: "rec-1",
      leadId: null,
      title: "Osirele",
      description: "",
      priority: "low",
      status: "active",
    });

    const res = await PATCH(patchRequest(), { params });

    expect(res.status).toBe(403);
    expect(mocks.updateAiRecommendation).not.toHaveBeenCalled();
  });

  it("volajuci s agenturou stale nemoze upravit odporucanie cudzieho leadu", async () => {
    mocks.leadRow.mockResolvedValue({ data: { agency_id: AGENCY_B } });

    const res = await PATCH(patchRequest(), { params });

    expect(res.status).toBe(403);
    expect(mocks.updateAiRecommendation).not.toHaveBeenCalled();
  });

  it("volajuci upravi odporucanie vlastneho leadu", async () => {
    const res = await PATCH(patchRequest(), { params });

    expect(res.status).toBe(200);
    expect(mocks.updateAiRecommendation).toHaveBeenCalledTimes(1);
  });
});
