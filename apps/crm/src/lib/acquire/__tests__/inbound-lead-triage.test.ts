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

  describe("zlyhanie AI kroku je vidieť (AI-FAIL-VISIBLE)", () => {
    const authError = () =>
      Object.assign(new Error("invalid x-api-key: Ján Novák jan.novak@example.com"), {
        status: 401,
        requestID: "req_9",
        type: "authentication_error",
      });

    it("AI zlyhanie sa klasifikuje, zaloguje a zapíše trvalo — lead ostáva, nič nehádže", async () => {
      const supa = makeSupaMock({});
      const recordAiFailureEvent = vi.fn().mockResolvedValue(undefined);
      const createNotification = vi.fn();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      await expect(
        runInboundLeadTriageAndNotify(supa, lead, candidate, {
          triageLeadBatches: vi.fn().mockRejectedValue(authError()),
          createNotification,
          resolveOwnerProfileId: vi.fn(),
          recordAiFailureEvent,
        }),
      ).resolves.toBeUndefined();

      expect(recordAiFailureEvent).toHaveBeenCalledTimes(1);
      expect(recordAiFailureEvent).toHaveBeenCalledWith({
        agencyId: lead.agency_id,
        leadId: "lead-1",
        feature: "inbound_triage",
        failure: expect.objectContaining({ reason: "auth", httpStatus: 401, requestId: "req_9" }),
      });
      expect(createNotification).not.toHaveBeenCalled();

      const line = warn.mock.calls.map((c) => String(c[0])).find((l) => l.includes("AI_CALL_FAILED")) ?? "";
      expect(JSON.parse(line)).toMatchObject({
        feature: "inbound_triage",
        reason: "auth",
        http_status: 401,
        lead_id: "lead-1",
      });
      warn.mockRestore();
    });

    it("text chyby (meno, e-mail z leadu) sa nedostane ani do logu, ani do záznamu", async () => {
      const supa = makeSupaMock({});
      const recordAiFailureEvent = vi.fn().mockResolvedValue(undefined);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      await runInboundLeadTriageAndNotify(supa, lead, candidate, {
        triageLeadBatches: vi.fn().mockRejectedValue(authError()),
        createNotification: vi.fn(),
        resolveOwnerProfileId: vi.fn(),
        recordAiFailureEvent,
      });

      const everything = JSON.stringify([warn.mock.calls, recordAiFailureEvent.mock.calls]);
      expect(everything).not.toContain("jan.novak@example.com");
      expect(everything).not.toContain("Novák");
      warn.mockRestore();
    });

    it("chyba mimo AI (zápis do DB) nie je AI zlyhanie — nezapisuje sa", async () => {
      const supa = makeSupaMock({ updateError: "db down" });
      const recordAiFailureEvent = vi.fn();
      const error = vi.spyOn(console, "error").mockImplementation(() => {});

      await runInboundLeadTriageAndNotify(supa, lead, candidate, {
        triageLeadBatches: vi
          .fn()
          .mockResolvedValue([{ lead_id: "lead-1", priority: "Vysoká", reason: "Rýchla odpoveď." }]),
        createNotification: vi.fn(),
        resolveOwnerProfileId: vi.fn(),
        recordAiFailureEvent,
      });

      expect(recordAiFailureEvent).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalled();
      error.mockRestore();
    });

    it("úspech nič nezapisuje", async () => {
      const recordAiFailureEvent = vi.fn();
      await runInboundLeadTriageAndNotify(makeSupaMock({}), lead, candidate, {
        triageLeadBatches: vi
          .fn()
          .mockResolvedValue([{ lead_id: "lead-1", priority: "Nízka", reason: "Bez kontextu." }]),
        createNotification: vi.fn().mockResolvedValue(undefined),
        resolveOwnerProfileId: vi.fn().mockResolvedValue(null),
        recordAiFailureEvent,
      });
      expect(recordAiFailureEvent).not.toHaveBeenCalled();
    });

    it("zlyhanie zápisu záznamu nezhodí príjem leadu", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      await expect(
        runInboundLeadTriageAndNotify(makeSupaMock({}), lead, candidate, {
          triageLeadBatches: vi.fn().mockRejectedValue(authError()),
          createNotification: vi.fn(),
          resolveOwnerProfileId: vi.fn(),
          recordAiFailureEvent: vi.fn().mockRejectedValue(new Error("db down")),
        }),
      ).resolves.toBeUndefined();
      warn.mockRestore();
      error.mockRestore();
    });
  });
});
