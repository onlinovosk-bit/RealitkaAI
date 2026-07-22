import { describe, expect, it, vi, beforeEach } from "vitest";

const mockTriage = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/lib/acquire/inbound-lead-triage", () => ({
  runInboundLeadTriageAndNotify: (...args: unknown[]) => mockTriage(...args),
}));

function requireLocalTestDb() {
  const url = process.env.TEST_SUPABASE_URL ?? "";
  if (!url.includes("127.0.0.1") && !url.includes("localhost")) {
    throw new Error(`TEST_SUPABASE_URL must be local ephemeral DB, got: ${url || "(empty)"}`);
  }
  if (!process.env.TEST_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing TEST_SUPABASE_SERVICE_ROLE_KEY");
  }
}

describe("POST /api/valuation/submit (Smolko integration)", () => {
  beforeEach(() => {
    mockTriage.mockClear();
  });

  it("invokes triage notify after lead and consent persist", async () => {
    requireLocalTestDb();

    const { POST } = await import("../route");
    const email = `vitest-triage-${Date.now()}@revolis.test`;
    const request = new Request("http://localhost/api/valuation/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": `10.88.${Date.now() % 200}.${Math.floor(Math.random() * 200)}`,
      },
      body: JSON.stringify({
        agencySlug: "reality-smolko",
        propertyType: "byt",
        location: "Košice",
        sqm: 75,
        name: "Vitest Triage",
        email,
        phone: "0900123456",
        sellWithin12Months: false,
        privacyAck: true,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    await vi.waitFor(
      () => {
        expect(mockTriage).toHaveBeenCalledTimes(1);
      },
      { timeout: 5000, interval: 50 },
    );
  });
});
