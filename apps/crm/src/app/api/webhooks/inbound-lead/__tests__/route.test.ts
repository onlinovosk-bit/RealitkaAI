import { beforeEach, describe, expect, it, vi } from "vitest";

const processInboundLead = vi.fn();
const createServiceRoleClient = vi.fn();

vi.mock("@/lib/inbound/process-lead", () => ({
  processInboundLead: (...args: unknown[]) => processInboundLead(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => createServiceRoleClient(),
}));

describe("POST /api/webhooks/inbound-lead", () => {
  beforeEach(() => {
    vi.resetModules();
    processInboundLead.mockReset();
    createServiceRoleClient.mockReset();
    delete process.env.INBOUND_WEBHOOK_SECRET;
  });

  it("returns 503 when INBOUND_WEBHOOK_SECRET is unset (fail-closed)", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/webhooks/inbound-lead", {
        method: "POST",
        body: JSON.stringify({ name: "A", profileId: "p1" }),
      }) as never,
    );
    expect(res.status).toBe(503);
    expect(processInboundLead).not.toHaveBeenCalled();
  });

  it("returns 401 when Bearer token mismatches", async () => {
    process.env.INBOUND_WEBHOOK_SECRET = "expected-secret";
    createServiceRoleClient.mockReturnValue({ from: vi.fn() });
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/webhooks/inbound-lead", {
        method: "POST",
        headers: { authorization: "Bearer wrong" },
        body: JSON.stringify({ name: "A", profileId: "p1" }),
      }) as never,
    );
    expect(res.status).toBe(401);
    expect(processInboundLead).not.toHaveBeenCalled();
  });

  it("passes service-role client into processInboundLead on valid auth", async () => {
    process.env.INBOUND_WEBHOOK_SECRET = "expected-secret";
    const admin = { from: vi.fn() };
    createServiceRoleClient.mockReturnValue(admin);
    processInboundLead.mockResolvedValue({
      leadId: "lead-1",
      briScore: 10,
      replySent: false,
      replyChannels: [],
    });

    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/webhooks/inbound-lead", {
        method: "POST",
        headers: {
          authorization: "Bearer expected-secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Ján Test",
          profileId: "11111111-1111-1111-1111-111111111111",
          email: "jan@example.com",
        }),
      }) as never,
    );

    expect(res.status).toBe(200);
    expect(processInboundLead).toHaveBeenCalledTimes(1);
    expect(processInboundLead.mock.calls[0][1]).toBe(admin);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, leadId: "lead-1" });
  });
});
