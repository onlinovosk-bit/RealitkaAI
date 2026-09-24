import { beforeEach, describe, expect, it, vi } from "vitest";
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
