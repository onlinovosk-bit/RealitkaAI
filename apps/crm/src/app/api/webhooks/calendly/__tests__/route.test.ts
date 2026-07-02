import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

const mockUpsert = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/lib/demo-ops/calendly-verify", () => ({
  verifyCalendlySignature: vi.fn(() => true),
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}));

function makeRequest(body: string): NextRequest {
  return new NextRequest("http://localhost/api/webhooks/calendly", {
    method: "POST",
    body,
    headers: { "calendly-webhook-signature": "t=1,v1=abc" },
  });
}

describe("POST /api/webhooks/calendly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CALENDLY_WEBHOOK_SECRET", "whsec_test");

    mockMaybeSingle.mockResolvedValue({ data: null });
    mockLimit.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder, maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder, limit: mockLimit });
    mockFrom.mockImplementation((table: string) => {
      if (table === "demo_prospects") {
        return { select: mockSelect, eq: mockEq };
      }
      return {
        upsert: mockUpsert.mockReturnValue({
          select: () => ({
            maybeSingle: () => Promise.resolve({ data: { id: "booking-1" }, error: null }),
          }),
        }),
      };
    });
  });

  it("returns 401 when signature invalid", async () => {
    const { verifyCalendlySignature } = await import("@/lib/demo-ops/calendly-verify");
    vi.mocked(verifyCalendlySignature).mockReturnValueOnce(false);
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(401);
  });

  it("stores invitee.created booking", async () => {
    const payload = {
      event: "invitee.created",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/X/invitees/Y",
        email: "jan@example.sk",
        name: "Jan",
        tracking: { utm_content: "goals_leads" },
      },
    };
    const res = await POST(makeRequest(JSON.stringify(payload)));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalled();
  });
});
