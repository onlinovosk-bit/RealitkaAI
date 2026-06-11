import { describe, expect, it, vi, beforeEach } from "vitest";

const insertMock = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: insertMock,
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockReturnThis(),
    }),
  }),
}));

import { createNotification } from "@/lib/notifications/store";

describe("[verification] Routine notifications store", () => {
  beforeEach(() => {
    insertMock.mockClear();
  });

  it("persists seller_rescue notification shape", async () => {
    await createNotification({
      agencyId: "agency-1",
      type: "seller_rescue",
      priority: "critical",
      title: "3 ohrozených klientov",
      body: "TOP riziko",
      data: { leads: [{ leadId: "l-1", churnScore: 90 }] },
    });
    expect(insertMock).toHaveBeenCalledOnce();
    const payload = insertMock.mock.calls[0]?.[0];
    expect(payload.type).toBe("seller_rescue");
    expect(payload.agency_id).toBe("agency-1");
    expect(payload.priority).toBe("critical");
  });

  it("supports ceo_command notification type", async () => {
    await createNotification({
      agencyId: "agency-1",
      type: "ceo_command",
      priority: "high",
      title: "Týždenný výkon",
    });
    expect(insertMock.mock.calls[0]?.[0].type).toBe("ceo_command");
  });
});
