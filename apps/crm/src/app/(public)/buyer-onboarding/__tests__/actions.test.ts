import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/auto-error-capture", () => ({
  autoErrorCapture: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

const AGENCY_ID = "11111111-1111-1111-1111-111111111111";
const LEAD_ID = "lead-buyer-onboarding-1";

function form(overrides: Record<string, string> = {}) {
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
  for (const [k, v] of Object.entries(overrides)) data.set(k, v);
  return data;
}

describe("submitBuyerOnboarding auto-response + honest rooms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LEAD_FORM_AGENCY_ID_SMOLKO = AGENCY_ID;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("calls runInboundLeadAutoResponse once after successful insert and does not invent rooms", async () => {
    let insertedRooms: string | undefined;

    mockFrom.mockImplementation((table: string) => {
      if (table === "leads") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
          insert: (row: Record<string, unknown>) => {
            insertedRooms = row.rooms as string;
            return {
              select: () => ({
                single: async () => ({
                  data: { id: LEAD_ID, agency_id: AGENCY_ID },
                  error: null,
                }),
              }),
            };
          },
        };
      }
      if (table === "buyer_intents") {
        return {
          upsert: () => ({
            select: () => ({
              single: async () => ({ data: { id: "intent-1" }, error: null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const { submitBuyerOnboarding } = await import("../actions");

    await expect(submitBuyerOnboarding(form())).rejects.toThrow(/NEXT_REDIRECT/);

    expect(insertedRooms).toBe("");
    expect(mockAutoResponse).toHaveBeenCalledTimes(1);
    expect(mockAutoResponse).toHaveBeenCalledWith(
      expect.anything(),
      { id: LEAD_ID, agency_id: AGENCY_ID },
      { agencyId: AGENCY_ID, name: "Ján Test", email: "jan@example.com" },
    );
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  it("does not invent rooms:2 izby in source", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const text = readFileSync(join(process.cwd(), "src/app/(public)/buyer-onboarding/actions.ts"), "utf8");
    expect(text).not.toContain('rooms: "2 izby"');
    expect(text).toContain("runInboundLeadAutoResponse");
  });
});
