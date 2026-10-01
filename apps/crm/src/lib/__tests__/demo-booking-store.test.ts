import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  createActivity: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

vi.mock("@/lib/activities-store", () => ({
  createActivity: mocks.createActivity,
}));

vi.mock("./auto-error-capture", () => ({
  autoErrorCapture: vi.fn(),
}));

import {
  createDemoBookingTask,
  runDemoBookingAutomation,
} from "@/lib/demo-booking-store";

const LEAD = {
  id: "saas-1",
  name: "Ján Demo",
  email: "jan@demo.sk",
  company: "Demo RK",
  agentsCount: 5,
};

describe("createDemoBookingTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createActivity.mockResolvedValue(undefined);
    mocks.insert.mockResolvedValue({ error: null });
    mocks.createServiceRoleClient.mockReturnValue({
      from: () => ({
        insert: mocks.insert,
      }),
    });
  });

  it("uses service-role client (not browser anon) for orphan CRM task", async () => {
    const result = await createDemoBookingTask({
      saasLead: LEAD,
      slots: [{ iso: "2026-09-14T10:00:00.000Z", label: "pondelok" }],
    });

    expect(mocks.createServiceRoleClient).toHaveBeenCalled();
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        lead_id: null,
        title: "Naplánovať demo pre Demo RK",
        status: "open",
        priority: "high",
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ ok: true, mode: "database" }),
    );
  });

  it("returns service_role_missing when admin client unavailable", async () => {
    mocks.createServiceRoleClient.mockReturnValue(null);

    const result = await createDemoBookingTask({
      saasLead: LEAD,
      slots: [],
    });

    expect(result).toEqual(
      expect.objectContaining({ ok: false, mode: "service_role_missing" }),
    );
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("runDemoBookingAutomation is not ok when task insert fails", async () => {
    mocks.insert.mockResolvedValue({ error: { message: "RLS blocked" } });

    const result = await runDemoBookingAutomation(LEAD);

    expect(result.ok).toBe(false);
    expect(result.taskResult.ok).toBe(false);
  });
});
