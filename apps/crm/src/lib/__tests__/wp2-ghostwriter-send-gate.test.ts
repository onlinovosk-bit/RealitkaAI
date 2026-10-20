import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// WP-2 SEND-GATE: /api/ghostwriter/send-email musí ísť cez authorizeSend
// (Control Contract + kill switch). Používa sa REÁLNY authorizeSend a reálny
// AGENT_KILL_SWITCH; mockuje sa len Resend, Supabase a audit. Nič sa neposiela.

const getUserMock = vi.fn();
const resolveProfileMock = vi.fn();
const resendSendMock = vi.fn();
const logAiActionMock = vi.fn();
const rateLimitMock = vi.fn();
const adminUpdateMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: () => getUserMock() } }),
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
      update: (...a: unknown[]) => {
        adminUpdateMock(...a);
        return { eq: async () => ({}) };
      },
    }),
  }),
}));
vi.mock("@/lib/ai/rate-guard", () => ({
  checkAiRateLimit: (...a: unknown[]) => rateLimitMock(...a),
}));
vi.mock("@/lib/profiles/resolve-profile-for-auth", () => ({
  resolveProfileForAuthUser: (...a: unknown[]) => resolveProfileMock(...a),
}));
vi.mock("@/lib/ai-action-audit", () => ({
  logAiAction: (...a: unknown[]) => logAiActionMock(...a),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: (...a: unknown[]) => resendSendMock(...a) };
  },
}));

function post(body: Record<string, unknown>): Request {
  return new Request("https://crm.local/api/ghostwriter/send-email", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const VALID = {
  letterId: "tmp_1",
  recipientEmail: "majitel@example.sk",
  letterHtml: "<p>List</p>",
  ownerAddress: "Hlavná 1",
};

async function callRoute(body: Record<string, unknown> = VALID) {
  const { POST } = await import("@/app/api/ghostwriter/send-email/route");
  const response = await POST(post(body));
  return { response, json: await response.json() };
}

describe("WP-2 ghostwriter/send-email — authorizeSend + kill switch", () => {
  const savedKill = process.env.AGENT_KILL_SWITCH;
  const savedKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AGENT_KILL_SWITCH;
    process.env.RESEND_API_KEY = "re_test_mock";
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1", email: "makler@a.sk" } } });
    resolveProfileMock.mockResolvedValue({
      profile: { id: "p-1", agency_id: "agency-A", email: "makler@a.sk" },
    });
    rateLimitMock.mockResolvedValue(null);
    resendSendMock.mockResolvedValue({ data: { id: "email-1" }, error: null });
    logAiActionMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (savedKill === undefined) delete process.env.AGENT_KILL_SWITCH;
    else process.env.AGENT_KILL_SWITCH = savedKill;
    if (savedKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = savedKey;
  });

  it("(a) kill switch zapnutý -> odoslanie zablokované (503), Resend sa nevolá, audit zapísaný", async () => {
    process.env.AGENT_KILL_SWITCH = "1";
    const { response, json } = await callRoute();

    expect(response.status).toBe(503);
    expect(json.error).toMatch(/kill switch/i);
    expect(resendSendMock).not.toHaveBeenCalled();
    expect(logAiActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId: "agency-A",
        actionKind: "send_failed",
        meta: expect.objectContaining({ blocked: true, authority: "FORBIDDEN" }),
      }),
    );
  });

  it("(a) kill switch 'true' blokuje rovnako (alternatívny zápis)", async () => {
    process.env.AGENT_KILL_SWITCH = "true";
    const { response } = await callRoute();
    expect(response.status).toBe(503);
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("(b) povolená cesta stále odošle cez Resend a zapíše human_approved + sent", async () => {
    const { response, json } = await callRoute();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({ ok: true, emailId: "email-1" });
    expect(resendSendMock).toHaveBeenCalledTimes(1);
    expect(resendSendMock.mock.calls[0][0]).toMatchObject({ to: "majitel@example.sk" });
    const kinds = logAiActionMock.mock.calls.map((c) => (c[0] as { actionKind: string }).actionKind);
    expect(kinds).toEqual(["human_approved", "sent"]);
    expect(logAiActionMock.mock.calls[0][0]).toMatchObject({
      agencyId: "agency-A",
      meta: expect.objectContaining({
        authority_rules: expect.arrayContaining(["irreversible_floor", "approval_granted"]),
      }),
    });
  });

  it("(b) rate-limit ostáva: pri bloku sa nevolá ani brána, ani Resend", async () => {
    rateLimitMock.mockResolvedValue({ error: "limit" });
    const { response } = await callRoute();
    expect(response.status).toBe(429);
    expect(resendSendMock).not.toHaveBeenCalled();
    expect(logAiActionMock).not.toHaveBeenCalled();
  });

  it("(c) tenant: používateľ bez agentúry nesmie odoslať (403), Resend sa nevolá", async () => {
    resolveProfileMock.mockResolvedValue({ profile: { id: "p-9", agency_id: null, email: "x@y.sk" } });
    const { response } = await callRoute();
    expect(response.status).toBe(403);
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("(c) tenant: brána dostane agentúru volajúceho (nie hodnotu z tela požiadavky)", async () => {
    await callRoute({ ...VALID, agencyId: "agency-B", tenantId: "agency-B" });
    expect(logAiActionMock.mock.calls[0][0]).toMatchObject({ agencyId: "agency-A" });
  });

  it("nepodpísaný používateľ -> 401 a nič sa neodošle", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { response } = await callRoute();
    expect(response.status).toBe(401);
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("zlyhanie Resend sa auditne zapíše ako send_failed", async () => {
    resendSendMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    const { response } = await callRoute();
    expect(response.status).toBe(500);
    const kinds = logAiActionMock.mock.calls.map((c) => (c[0] as { actionKind: string }).actionKind);
    expect(kinds).toEqual(["human_approved", "send_failed"]);
  });
});
