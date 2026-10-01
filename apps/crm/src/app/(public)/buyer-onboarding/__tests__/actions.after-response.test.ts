// LEAD-PIPELINE-AFTER: notifikácia + auto-odpoveď + rescore sa po odoslaní formulára nesmú stratiť.
// Pôvodne `notify(...).catch`, `void autoResponse(...)` a `rescore(...).catch` bez `await` — na
// serverless by sa po presmerovaní nedokončili (viď valuation/submit/__tests__/route.after-response.test.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const afterCallbacks = vi.hoisted(() => [] as Array<() => Promise<void>>);
const mockAutoResponse = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockNotify = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRescore = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockCreateTask = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "task-1" }));
const mockFrom = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
);

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (cb: () => Promise<void>) => afterCallbacks.push(cb) };
});
vi.mock("@/lib/acquire/inbound-lead-auto-response", () => ({
  runInboundLeadAutoResponse: (...args: unknown[]) => mockAutoResponse(...args),
}));
vi.mock("@/lib/notify-new-lead", () => ({
  notifyNewBuyerLead: (...args: unknown[]) => mockNotify(...args),
}));
vi.mock("@/lib/rescore-lead", () => ({
  rescoreLead: (...args: unknown[]) => mockRescore(...args),
}));
vi.mock("@/lib/tasks-store", () => ({
  createTask: (...args: unknown[]) => mockCreateTask(...args),
}));
vi.mock("@/lib/auto-error-capture", () => ({ autoErrorCapture: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => mockRedirect(url) }));

const AGENCY_ID = "11111111-1111-1111-1111-111111111111";
const LEAD_ID = "lead-buyer-after-1";

function form() {
  const data = new FormData();
  data.set("name", "Ján Test");
  data.set("email", "jan@example.com");
  data.set("phone", "0900123456");
  data.set("dealType", "buy");
  data.set("propertyType", "flat");
  data.set("primaryCity", "Košice");
  data.set("budgetMin", "100000");
  data.set("budgetMax", "200000");
  data.set("timeHorizonMonths", "3-6");
  return data;
}

describe("submitBuyerOnboarding — práca po odpovedi (after)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
    process.env.LEAD_FORM_AGENCY_ID_SMOLKO = AGENCY_ID;
    mockNotify.mockResolvedValue(undefined);
    mockAutoResponse.mockResolvedValue(undefined);
    mockRescore.mockResolvedValue(undefined);
    mockFrom.mockImplementation((table: string) => {
      if (table === "leads") {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: LEAD_ID, agency_id: AGENCY_ID }, error: null }),
            }),
          }),
        };
      }
      if (table === "buyer_intents") {
        return {
          upsert: () => ({
            select: () => ({ single: async () => ({ data: { id: "intent-1" }, error: null }) }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("notifikácia, auto-odpoveď a rescore sú pri odpovedi len naplánované; dobehnú až v after() v poradí", async () => {
    const { submitBuyerOnboarding } = await import("../actions");

    await expect(submitBuyerOnboarding(form())).rejects.toThrow(/NEXT_REDIRECT/);

    expect(afterCallbacks).toHaveLength(1);
    expect(mockNotify).not.toHaveBeenCalled();
    expect(mockAutoResponse).not.toHaveBeenCalled();
    expect(mockRescore).not.toHaveBeenCalled();

    await afterCallbacks[0]();

    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockAutoResponse).toHaveBeenCalledTimes(1);
    expect(mockRescore).toHaveBeenCalledWith(LEAD_ID);
    expect(mockNotify.mock.invocationCallOrder[0]).toBeLessThan(mockAutoResponse.mock.invocationCallOrder[0]);
    expect(mockAutoResponse.mock.invocationCallOrder[0]).toBeLessThan(mockRescore.mock.invocationCallOrder[0]);
    expect(mockAutoResponse).toHaveBeenCalledWith(
      expect.anything(),
      { id: LEAD_ID, agency_id: AGENCY_ID },
      { agencyId: AGENCY_ID, name: "Ján Test", email: "jan@example.com" },
    );
  });

  it("auto-odpoveď a rescore bežia aj keď interná notifikácia zlyhá", async () => {
    mockNotify.mockRejectedValue(new Error("smtp down"));
    const { submitBuyerOnboarding } = await import("../actions");

    await expect(submitBuyerOnboarding(form())).rejects.toThrow(/NEXT_REDIRECT/);
    await afterCallbacks[0]();

    expect(mockAutoResponse).toHaveBeenCalledTimes(1);
    expect(mockRescore).toHaveBeenCalledTimes(1);
  });
});
