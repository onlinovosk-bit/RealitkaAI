import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveTenantSupabase: vi.fn(),
  createActivity: vi.fn(),
  insertSelectSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/resolve-client", () => ({
  resolveTenantSupabase: mocks.resolveTenantSupabase,
}));

vi.mock("@/lib/activities-store", () => ({
  createActivity: mocks.createActivity,
}));

import { createSaasLead } from "@/lib/sales-funnel-store";

describe("createSaasLead fail-closed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createActivity.mockResolvedValue(undefined);
  });

  it("throws on insert error instead of returning a fake UUID", async () => {
    mocks.insertSelectSingle.mockResolvedValue({
      data: null,
      error: { message: "permission denied for table saas_leads" },
    });
    mocks.resolveTenantSupabase.mockResolvedValue({
      from: () => ({
        insert: () => ({
          select: () => ({
            single: mocks.insertSelectSingle,
          }),
        }),
      }),
    });

    await expect(
      createSaasLead({
        name: "Test",
        email: "t@example.com",
        company: "Co",
        agentsCount: 3,
      }),
    ).rejects.toThrow(/permission denied/);
  });

  it("returns durable row on success", async () => {
    mocks.insertSelectSingle.mockResolvedValue({
      data: {
        id: "real-uuid",
        name: "Test",
        email: "t@example.com",
        phone: "",
        company: "Co",
        agents_count: 3,
        city: "",
        note: "",
        source: "Landing page",
        status: "new",
        created_at: "2026-09-13T00:00:00.000Z",
      },
      error: null,
    });
    mocks.resolveTenantSupabase.mockResolvedValue({
      from: () => ({
        insert: () => ({
          select: () => ({
            single: mocks.insertSelectSingle,
          }),
        }),
      }),
    });

    const lead = await createSaasLead({
      name: "Test",
      email: "t@example.com",
      company: "Co",
      agentsCount: 3,
    });

    expect(lead.id).toBe("real-uuid");
  });
});
