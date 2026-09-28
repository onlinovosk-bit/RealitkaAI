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
import { NextRequest } from "next/server";

const mockProcess = vi.hoisted(() => vi.fn());

vi.mock("@/lib/inbound/process-lead", async () => {
  const actual = await vi.importActual<typeof import("@/lib/inbound/process-lead")>(
    "@/lib/inbound/process-lead",
  );
  return { ...actual, processInboundLead: (...a: unknown[]) => mockProcess(...a) };
});

import { InboundLeadError } from "@/lib/inbound/process-lead";
import { POST } from "../route";

const SECRET = "s3cret-inbound";

function req(headers: Record<string, string> = {}, body: unknown = { name: "Ján", profileId: "p1" }) {
  return new NextRequest("http://localhost/api/webhooks/inbound-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks/inbound-lead — auth is mandatory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockProcess.mockResolvedValue({ leadId: "l1", briScore: 50, draftCreated: true, replySent: false });
  });

  it("is closed (503) when INBOUND_WEBHOOK_SECRET is not set — even with no auth header", async () => {
    vi.stubEnv("INBOUND_WEBHOOK_SECRET", "");
    const res = await POST(req());
    expect(res.status).toBe(503);
    expect(mockProcess).not.toHaveBeenCalled();
  });

  it("rejects a missing bearer with 401", async () => {
    vi.stubEnv("INBOUND_WEBHOOK_SECRET", SECRET);
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(mockProcess).not.toHaveBeenCalled();
  });

  it("rejects a wrong bearer with 401", async () => {
    vi.stubEnv("INBOUND_WEBHOOK_SECRET", SECRET);
    const res = await POST(req({ authorization: "Bearer nope" }));
    expect(res.status).toBe(401);
    expect(mockProcess).not.toHaveBeenCalled();
  });

  it("accepts the correct bearer and reports that nothing was sent", async () => {
    vi.stubEnv("INBOUND_WEBHOOK_SECRET", SECRET);
    const res = await POST(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, draftCreated: true, replySent: false });
  });

  it("maps InboundLeadError to its status without leaking internals", async () => {
    vi.stubEnv("INBOUND_WEBHOOK_SECRET", SECRET);
    mockProcess.mockRejectedValue(new InboundLeadError("Neznámy profileId.", 422));
    const res = await POST(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(422);
  });

  it("returns a generic 500 for unexpected errors", async () => {
    vi.stubEnv("INBOUND_WEBHOOK_SECRET", SECRET);
    mockProcess.mockRejectedValue(new Error("lead insert failed: secret db detail"));
    const res = await POST(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret db detail");
  });
});
