// LEAD-PIPELINE-AFTER: triáž + auto-odpoveď sa po odoslaní odpovede nesmú stratiť.
//
// 2026-10-01 10:14 UTC: lead z widgetu vznikol, ale nemal ai_triage_at ani auto_response_sent_at —
// route ich spúšťala ako `void fn()` a serverless funkcia sa po odpovedi zmrazila. Tento test
// nahrádza `after()` zachytávačom, takže overuje presne to, čo sa v produkcii stráca:
// práca je PRI odpovedi len naplánovaná a dobehne až v callbacku `after()`.
import { beforeEach, describe, expect, it, vi } from "vitest";

const afterCallbacks = vi.hoisted(() => [] as Array<() => Promise<void>>);
const mockTriage = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockAutoResponse = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockResolveTenant = vi.hoisted(() => vi.fn());
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
vi.mock("@/lib/valuation/tenant", () => ({
  resolveTenantRecord: (...args: unknown[]) => mockResolveTenant(...args),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));
vi.mock("@/lib/valuation/commentary", () => ({
  enrichEstimateCommentary: vi.fn().mockResolvedValue("Deterministický odhad."),
}));

const AGENCY_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const LEAD_ID = "lead-valuation-after-1";

function makeRequest() {
  return new Request("http://localhost/api/valuation/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.8" },
    body: JSON.stringify({
      agencySlug: "reality-smolko",
      propertyType: "byt",
      location: "Košice",
      sqm: 75,
      name: "Ján Test",
      email: "jan@example.com",
      phone: "0900123456",
      sellWithin12Months: false,
      privacyAck: true,
    }),
  });
}

function mockNonSandboxTenantTables() {
  mockResolveTenant.mockResolvedValue({ agencyId: AGENCY_ID, isSandbox: false, slug: "reality-smolko" });
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
    if (table === "lead_consents") return { insert: async () => ({ data: null, error: null }) };
    throw new Error(`unexpected table ${table}`);
  });
}

describe("POST /api/valuation/submit — práca po odpovedi (after)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
    mockTriage.mockResolvedValue(undefined);
    mockAutoResponse.mockResolvedValue(undefined);
  });

  it("pri odpovedi je triáž aj auto-odpoveď len naplánovaná; dobehnú až v after() a v poradí triáž → auto-odpoveď", async () => {
    mockNonSandboxTenantTables();
    const { POST } = await import("../route");

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);

    // Odpoveď je preč, práca ešte nebežala — presne tu sa v produkcii stratila.
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
      { agencyId: AGENCY_ID, name: "Ján Test", email: "jan@example.com" },
    );
  });

  it("auto-odpoveď sa pošle aj keď triáž zlyhá (potvrdenie klientovi nesmie závisieť od AI)", async () => {
    mockNonSandboxTenantTables();
    mockTriage.mockRejectedValue(new Error("anthropic down"));
    const { POST } = await import("../route");

    expect((await POST(makeRequest())).status).toBe(200);
    await afterCallbacks[0]();

    expect(mockAutoResponse).toHaveBeenCalledTimes(1);
  });

  it("sandbox tenant: nič sa nenaplánuje (e-mail sa tam nikdy neposiela)", async () => {
    mockResolveTenant.mockResolvedValue({ agencyId: AGENCY_ID, isSandbox: true, slug: "demo" });
    mockFrom.mockImplementation((table: string) => {
      if (table === "sandbox_submissions") return { insert: async () => ({ data: null, error: null }) };
      throw new Error(`unexpected table ${table}`);
    });
    const { POST } = await import("../route");

    expect((await POST(makeRequest())).status).toBe(200);
    expect(afterCallbacks).toHaveLength(0);
    expect(mockTriage).not.toHaveBeenCalled();
    expect(mockAutoResponse).not.toHaveBeenCalled();
  });
});
