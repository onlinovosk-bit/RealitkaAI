import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockTriage = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockAutoResponse = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockSendInboundAutoResponse = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true }),
);
const mockResolveTenant = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ allowed: true }),
);
const mockFrom = vi.hoisted(() => vi.fn());
const mockEnrich = vi.hoisted(() =>
  vi.fn().mockResolvedValue("Deterministický odhad."),
);

vi.mock("@/lib/acquire/inbound-lead-triage", () => ({
  runInboundLeadTriageAndNotify: (...args: unknown[]) => mockTriage(...args),
}));

vi.mock("@/lib/acquire/inbound-lead-auto-response", () => ({
  runInboundLeadAutoResponse: (...args: unknown[]) => mockAutoResponse(...args),
}));

vi.mock("@/lib/acquire/send-inbound-auto-response", () => ({
  sendInboundAutoResponse: (...args: unknown[]) =>
    mockSendInboundAutoResponse(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
}));

vi.mock("@/lib/valuation/tenant", () => ({
  resolveTenantRecord: (...args: unknown[]) => mockResolveTenant(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));

vi.mock("@/lib/valuation/commentary", () => ({
  enrichEstimateCommentary: (...args: unknown[]) => mockEnrich(...args),
}));

const AGENCY_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const LEAD_ID = "lead-valuation-1";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    agencySlug: "reality-smolko",
    propertyType: "byt",
    location: "Košice",
    sqm: 75,
    name: "Ján Test",
    email: "jan@example.com",
    phone: "0900123456",
    sellWithin12Months: false,
    privacyAck: true,
    ...overrides,
  };
}

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/valuation/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "10.0.0.8",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/valuation/submit auto-response wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ allowed: true });
    mockEnrich.mockResolvedValue("Deterministický odhad.");
    mockTriage.mockResolvedValue(undefined);
    mockAutoResponse.mockResolvedValue(undefined);
    mockSendInboundAutoResponse.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("calls auto-response after triage for non-sandbox tenant", async () => {
    mockResolveTenant.mockResolvedValue({
      agencyId: AGENCY_ID,
      isSandbox: false,
      slug: "reality-smolko",
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "leads") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: LEAD_ID,
                  name: "Ján Test",
                  status: "Nový",
                  score: 50,
                  last_contact: "Práve vytvorený",
                  note: "n",
                  source: "valuation_widget",
                  agency_id: AGENCY_ID,
                  ai_triage_at: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "lead_consents") {
        return {
          insert: async () => ({ data: null, error: null }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const { POST } = await import("../route");
    const response = await POST(makeRequest(validBody()));
    expect(response.status).toBe(200);

    await vi.waitFor(() => {
      expect(mockTriage).toHaveBeenCalledTimes(1);
      expect(mockAutoResponse).toHaveBeenCalledTimes(1);
    });

    expect(mockAutoResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: LEAD_ID, agency_id: AGENCY_ID }),
      {
        agencyId: AGENCY_ID,
        name: "Ján Test",
        email: "jan@example.com",
      },
    );
    expect(mockSendInboundAutoResponse).not.toHaveBeenCalled();
  });

  it("does not call auto-response for sandbox tenant", async () => {
    mockResolveTenant.mockResolvedValue({
      agencyId: AGENCY_ID,
      isSandbox: true,
      slug: "demo-sandbox",
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "sandbox_submissions") {
        return {
          insert: async () => ({ data: null, error: null }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const { POST } = await import("../route");
    const response = await POST(makeRequest(validBody({ agencySlug: "demo-sandbox" })));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.sandbox).toBe(true);
    expect(mockTriage).not.toHaveBeenCalled();
    expect(mockAutoResponse).not.toHaveBeenCalled();
    expect(mockSendInboundAutoResponse).not.toHaveBeenCalled();
  });
});

describe("inbound auto-response template — no marketing copy", () => {
  it("excludes forbidden marketing strings", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const templatePath = join(
      process.cwd(),
      "src/lib/acquire/send-inbound-auto-response.ts",
    );
    const source = readFileSync(templatePath, "utf8");

    // GDPR: transactional reply only — no marketing copy in the template source.
    const forbidden = [
      "newsletter",
      "marketing",
      "akcia",
      "akcie",
      "zľava",
      "zlava",
      "promo",
      "odber",
      "special offer",
      "nezáväzná ponuka",
      "nezavazna ponuka",
      "kupón",
      "kupon",
    ];

    const lower = source.toLowerCase();
    for (const phrase of forbidden) {
      expect(lower).not.toContain(phrase);
    }
  });
});
