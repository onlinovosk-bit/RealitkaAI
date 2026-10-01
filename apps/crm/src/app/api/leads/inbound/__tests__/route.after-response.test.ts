// LEAD-PIPELINE-AFTER: triáž + auto-odpoveď sa po odoslaní odpovede nesmú stratiť (viď
// valuation/submit/__tests__/route.after-response.test.ts — rovnaká príčina, rovnaký dôkaz).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const AGENCY_ID = "11111111-1111-1111-1111-111111111111";
const TOKEN = "test-inbound-token-smolko";
const SLUG = "smolko";
const LEAD_ID = "lead-inbound-after-1";

const afterCallbacks = vi.hoisted(() => [] as Array<() => Promise<void>>);
const mockTriage = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockAutoResponse = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockFrom = vi.hoisted(() => vi.fn());

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (cb: () => Promise<void>) => afterCallbacks.push(cb) };
});

vi.mock("@/lib/auto-error-capture", () => ({ autoErrorCapture: vi.fn() }));
vi.mock("@/lib/acquire/inbound-lead-triage", () => ({
  runInboundLeadTriageAndNotify: (...args: unknown[]) => mockTriage(...args),
}));
vi.mock("@/lib/acquire/inbound-lead-auto-response", () => ({
  runInboundLeadAutoResponse: (...args: unknown[]) => mockAutoResponse(...args),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
}));
vi.mock("@/lib/inbound/reply-draft", () => ({
  INBOUND_REPLY_DRAFT_TIMEOUT_MS: 8000,
  scheduleInboundReplyDraft: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

function makeRequest() {
  return new Request("http://localhost/api/leads/inbound", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-forwarded-for": "10.0.0.9",
    },
    body: JSON.stringify({
      slug: SLUG,
      token: TOKEN,
      name: "Ján Inbound",
      email: "jan@example.com",
      phone: "0900111222",
      note: "Chcem obhliadku",
      consent: true,
    }),
  });
}

describe("POST /api/leads/inbound — práca po odpovedi (after)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
    vi.stubEnv("LEAD_FORM_TOKEN_SMOLKO", TOKEN);
    vi.stubEnv("LEAD_FORM_SLUG_SMOLKO", SLUG);
    vi.stubEnv("LEAD_FORM_AGENCY_ID_SMOLKO", AGENCY_ID);
    mockTriage.mockResolvedValue(undefined);
    mockAutoResponse.mockResolvedValue(undefined);
    mockFrom.mockImplementation((table: string) => {
      if (table === "leads") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: { id: LEAD_ID, agency_id: AGENCY_ID, source: "web_form" },
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

  it("pri odpovedi je triáž aj auto-odpoveď len naplánovaná; dobehnú až v after() a v poradí triáž → auto-odpoveď", async () => {
    const { POST } = await import("../route");

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);

    expect(afterCallbacks).toHaveLength(1);
    expect(mockTriage).not.toHaveBeenCalled();
    expect(mockAutoResponse).not.toHaveBeenCalled();

    await afterCallbacks[0]();

    expect(mockTriage).toHaveBeenCalledTimes(1);
    expect(mockAutoResponse).toHaveBeenCalledTimes(1);
    expect(mockTriage.mock.invocationCallOrder[0]).toBeLessThan(mockAutoResponse.mock.invocationCallOrder[0]);
    expect(mockAutoResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: LEAD_ID, agency_id: AGENCY_ID }),
      { agencyId: AGENCY_ID, name: "Ján Inbound", email: "jan@example.com" },
    );
  });

  it("auto-odpoveď sa pošle aj keď triáž zlyhá", async () => {
    mockTriage.mockRejectedValue(new Error("anthropic down"));
    const { POST } = await import("../route");

    expect((await POST(makeRequest())).status).toBe(200);
    await afterCallbacks[0]();

    expect(mockAutoResponse).toHaveBeenCalledTimes(1);
  });
});
