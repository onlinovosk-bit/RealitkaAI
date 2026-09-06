import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const AGENCY_ID = "11111111-1111-1111-1111-111111111111";
const TOKEN = "test-inbound-token-smolko";
const SLUG = "smolko";
const LEAD_ID = "lead-inbound-1";

const mockTriage = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockAutoResponse = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockSendInboundAutoResponse = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true }),
);
const mockFrom = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ allowed: true }),
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

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));

function makeJsonRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/leads/inbound", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-forwarded-for": "10.0.0.9",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/leads/inbound auto-response wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("LEAD_FORM_TOKEN_SMOLKO", TOKEN);
    vi.stubEnv("LEAD_FORM_SLUG_SMOLKO", SLUG);
    vi.stubEnv("LEAD_FORM_AGENCY_ID_SMOLKO", AGENCY_ID);
    mockRateLimit.mockResolvedValue({ allowed: true });
    mockTriage.mockResolvedValue(undefined);
    mockAutoResponse.mockResolvedValue(undefined);
    mockSendInboundAutoResponse.mockResolvedValue({ ok: true });

    mockFrom.mockImplementation((table: string) => {
      if (table === "leads") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: LEAD_ID,
                  agency_id: AGENCY_ID,
                  source: "web_form",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("runs triage + auto-response after successful insert with email", async () => {
    const { POST } = await import("../route");
    const response = await POST(
      makeJsonRequest({
        slug: SLUG,
        token: TOKEN,
        name: "Ján Inbound",
        email: "jan@example.com",
        phone: "0900111222",
        note: "Chcem obhliadku",
        consent: true,
      }),
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);

    await vi.waitFor(() => {
      expect(mockTriage).toHaveBeenCalledTimes(1);
      expect(mockAutoResponse).toHaveBeenCalledTimes(1);
    });

    expect(mockTriage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: LEAD_ID, agency_id: AGENCY_ID }),
      expect.objectContaining({
        agencyId: AGENCY_ID,
        name: "Ján Inbound",
        status: "Nový",
        source: "web_form",
      }),
    );

    expect(mockAutoResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: LEAD_ID, agency_id: AGENCY_ID }),
      {
        agencyId: AGENCY_ID,
        name: "Ján Inbound",
        email: "jan@example.com",
      },
    );
    expect(mockSendInboundAutoResponse).not.toHaveBeenCalled();
  });

  it("still succeeds with empty email — auto-response receives empty string", async () => {
    const { POST } = await import("../route");
    const response = await POST(
      makeJsonRequest({
        slug: SLUG,
        token: TOKEN,
        name: "Bez Emailu",
        email: "",
        phone: "0900111222",
        consent: true,
      }),
    );

    expect(response.status).toBe(200);

    await vi.waitFor(() => {
      expect(mockAutoResponse).toHaveBeenCalledTimes(1);
    });

    expect(mockAutoResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: LEAD_ID }),
      expect.objectContaining({ email: "" }),
    );
    expect(mockSendInboundAutoResponse).not.toHaveBeenCalled();
  });

  it("does not weaken consent guard", async () => {
    const { POST } = await import("../route");
    const response = await POST(
      makeJsonRequest({
        slug: SLUG,
        token: TOKEN,
        name: "Bez Súhlasu",
        email: "jan@example.com",
        consent: false,
      }),
    );

    expect(response.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockTriage).not.toHaveBeenCalled();
    expect(mockAutoResponse).not.toHaveBeenCalled();
  });
});
