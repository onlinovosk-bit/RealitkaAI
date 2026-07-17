import { describe, expect, it, vi } from "vitest";
import { runInboundLeadTriageAndNotify } from "../inbound-lead-triage";

function makeSupaMock(overrides: {
  guardTriageAt?: string | null;
  updateError?: string | null;
}) {
  const update = vi.fn().mockResolvedValue({ error: overrides.updateError ? { message: overrides.updateError } : null });
  const maybeSingle = vi.fn().mockResolvedValue({
    data: { ai_triage_at: overrides.guardTriageAt ?? null },
    error: null,
  });

  return {
    from: vi.fn((table: string) => {
      if (table === "leads") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({ error: overrides.updateError ? { message: overrides.updateError } : null }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    }),
    update,
    maybeSingle,
  } as unknown as Parameters<typeof runInboundLeadTriageAndNotify>[0];
}

describe("runInboundLeadTriageAndNotify", () => {
  const lead = {
    id: "lead-1",
    name: "SMOKE TEST",
    status: "Nový",
    score: 50,
    last_contact: "Práve vytvorený (email gateway)",
    note: "test",
    source: "portal:Nehnuteľnosti.sk",
    agency_id: "11111111-1111-1111-1111-111111111111",
    ai_triage_at: null,
  };

  const candidate = {
    agencyId: "11111111-1111-1111-1111-111111111111",
    name: "SMOKE TEST",
    status: "Nový",
    note: "test",
    source: "portal:Nehnuteľnosti.sk",
  };

  it("does not throw when triage engine fails (best-effort)", async () => {
    const supa = makeSupaMock({});
    const triageLeadBatches = vi.fn().mockRejectedValue(new Error("forced triage failure"));

    await expect(
      runInboundLeadTriageAndNotify(supa, lead, candidate, {
        triageLeadBatches,
        createNotification: vi.fn(),
        resolveOwnerProfileId: vi.fn(),
      }),
    ).resolves.toBeUndefined();
  });

  it("skips when ai_triage_at is already set (idempotency)", async () => {
    const supa = makeSupaMock({ guardTriageAt: "2026-07-07T10:00:00Z" });
    const triageLeadBatches = vi.fn();

    await runInboundLeadTriageAndNotify(supa, lead, candidate, {
      triageLeadBatches,
      createNotification: vi.fn(),
      resolveOwnerProfileId: vi.fn(),
    });

    expect(triageLeadBatches).not.toHaveBeenCalled();
  });

  it("writes triage + new_lead notification on success", async () => {
    const supa = makeSupaMock({});
    const triageLeadBatches = vi.fn().mockResolvedValue([
      {
        lead_id: "lead-1",
        priority: "Vysoká",
        reason: "Rýchla odpoveď je kľúčová.",
      },
    ]);
    const createNotification = vi.fn().mockResolvedValue(undefined);
    const resolveOwnerProfileId = vi.fn().mockResolvedValue("owner-profile-1");

    await runInboundLeadTriageAndNotify(supa, lead, candidate, {
      triageLeadBatches,
      createNotification,
      resolveOwnerProfileId,
    });

    expect(triageLeadBatches).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "new_lead",
        priority: "critical",
        data: expect.objectContaining({ leadId: "lead-1", ai_priority: "Vysoká" }),
      }),
    );
  });
});
