import { beforeEach, describe, expect, it, vi } from "vitest";

const insertMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: insertMock,
    })),
  })),
}));

import { logAiActionAudit } from "@/lib/ai-action-audit";
import { createServiceRoleClient } from "@/lib/supabase/admin";

describe("logAiActionAudit (cost telemetry)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertMock.mockResolvedValue({ error: null });
  });

  it("records cost fields on successful insert", async () => {
    const result = await logAiActionAudit(
      {
        agencyId: "agency-1",
        leadId: "lead-1",
        actionKind: "ai_suggested",
        channel: "email",
        costEur: 0.00042,
        model: "gpt-4.1-mini",
        latencyMs: 812,
        creditsSpent: 1,
      },
      { strict: true },
    );

    expect(result).toEqual({ ok: true });
    expect(insertMock).toHaveBeenCalledOnce();
    const row = insertMock.mock.calls[0]?.[0];
    expect(row.cost_eur).toBe(0.00042);
    expect(row.model).toBe("gpt-4.1-mini");
    expect(row.latency_ms).toBe(812);
  });

  it("strict mode throws on insert error without leaking body content", async () => {
    insertMock.mockResolvedValue({ error: { message: "db down", code: "500" } });

    await expect(
      logAiActionAudit(
        {
          agencyId: "agency-1",
          leadId: "lead-1",
          actionKind: "ai_suggested",
          channel: "email",
          bodyText: "secret client PII text",
          costEur: 0.01,
          model: "gpt-4.1-mini",
        },
        { strict: true },
      ),
    ).rejects.toThrow(/insert failed: db down/);

    const row = insertMock.mock.calls[0]?.[0];
    expect(row.body_hash).toMatch(/^[a-f0-9]{32}$/);
    expect(JSON.stringify(row)).not.toContain("secret client");
  });

  it("non-strict returns ok:false when service role client missing", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValueOnce(null);

    const result = await logAiActionAudit(
      {
        agencyId: null,
        leadId: null,
        actionKind: "ai_suggested",
        channel: "email",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("service_role_unavailable");
    }
  });
});
