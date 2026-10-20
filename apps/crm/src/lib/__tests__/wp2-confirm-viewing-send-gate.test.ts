import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// WP-2 SEND-GATE: /api/playbook/confirm-viewing musí ísť cez authorizeSend
// (Control Contract + kill switch). REÁLNY authorizeSend a AGENT_KILL_SWITCH;
// sendMessage, auth, leads-store a audit sú mocky. Nič sa reálne neposiela.

const getCurrentUserMock = vi.fn();
const getCurrentProfileMock = vi.fn();
const getLeadMock = vi.fn();
const sendMessageMock = vi.fn();
const readDemoModeMock = vi.fn();
const logAiActionMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
  getCurrentProfile: () => getCurrentProfileMock(),
}));
vi.mock("@/lib/leads-store", () => ({
  getLead: (...a: unknown[]) => getLeadMock(...a),
}));
vi.mock("@/lib/multi-channel-sender", () => ({
  sendMessage: (...a: unknown[]) => sendMessageMock(...a),
}));
vi.mock("@/lib/demo-mode-cookie", () => ({
  readDemoModeFromCookie: () => readDemoModeMock(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ marker: "scoped" }),
}));
vi.mock("@/lib/ai-action-audit", () => ({
  logAiAction: (...a: unknown[]) => logAiActionMock(...a),
}));

const LEAD = { id: "lead-1", name: "Jana Nová", email: "jana@example.sk", phone: "+421900111222" };
const BODY = { leadId: "lead-1", playbookItemId: "viewing-1", subtitle: "Zajtra o 15:00" };

async function callRoute(body: Record<string, unknown> = BODY) {
  const { POST } = await import("@/app/api/playbook/confirm-viewing/route");
  const response = (await POST(
    new Request("https://crm.local/api/playbook/confirm-viewing", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  )) as Response;
  return { response, json: await response.json() };
}

describe("WP-2 playbook/confirm-viewing — authorizeSend + kill switch", () => {
  const savedKill = process.env.AGENT_KILL_SWITCH;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AGENT_KILL_SWITCH;
    getCurrentUserMock.mockResolvedValue({ id: "u-1", email: "makler@a.sk" });
    getCurrentProfileMock.mockResolvedValue({ id: "p-1", agency_id: "agency-A", email: "makler@a.sk" });
    readDemoModeMock.mockResolvedValue(false);
    getLeadMock.mockResolvedValue(LEAD);
    sendMessageMock.mockResolvedValue({ ok: true });
    logAiActionMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (savedKill === undefined) delete process.env.AGENT_KILL_SWITCH;
    else process.env.AGENT_KILL_SWITCH = savedKill;
  });

  it("(a) kill switch zapnutý -> e-mail ani SMS sa neodošle (503), audit zapísaný", async () => {
    process.env.AGENT_KILL_SWITCH = "1";
    const { response, json } = await callRoute();

    expect(response.status).toBe(503);
    expect(json.ok).toBe(false);
    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(logAiActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId: "agency-A",
        leadId: "lead-1",
        actionKind: "send_failed",
        meta: expect.objectContaining({ blocked: true, authority: "FORBIDDEN" }),
      }),
    );
  });

  it("(a) kill switch blokuje aj SMS-only lead (bez e-mailu)", async () => {
    process.env.AGENT_KILL_SWITCH = "true";
    getLeadMock.mockResolvedValue({ ...LEAD, email: "" });
    const { response } = await callRoute();
    expect(response.status).toBe(503);
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it("(a) kill switch pri zlyhaní e-mailu nepustí SMS záložnú cestu", async () => {
    // e-mail zlyhá a počas toho sa zapne switch -> SMS cesta musí byť zablokovaná
    sendMessageMock.mockImplementationOnce(async () => {
      process.env.AGENT_KILL_SWITCH = "1";
      return { ok: false, error: "provider down" };
    });
    const { response } = await callRoute();
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(503);
  });

  it("(b) povolená cesta stále odošle e-mail a zapíše human_approved + sent", async () => {
    const { response, json } = await callRoute();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({ ok: true, sent: true, channel: "email", to: "jana@example.sk" });
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock.mock.calls[0][0]).toMatchObject({ channel: "email", leadId: "lead-1" });
    const kinds = logAiActionMock.mock.calls.map((c) => (c[0] as { actionKind: string }).actionKind);
    expect(kinds).toEqual(["human_approved", "sent"]);
  });

  it("(b) pri zlyhaní e-mailu stále ide SMS (správanie zachované), každá cez bránu", async () => {
    sendMessageMock.mockResolvedValueOnce({ ok: false, error: "no key" });
    sendMessageMock.mockResolvedValueOnce({ ok: true });
    const { json } = await callRoute();
    expect(json).toMatchObject({ sent: true, channel: "sms" });
    expect(sendMessageMock).toHaveBeenCalledTimes(2);
    const approvals = logAiActionMock.mock.calls.filter(
      (c) => (c[0] as { actionKind: string }).actionKind === "human_approved",
    );
    expect(approvals).toHaveLength(2);
  });

  it("(c) tenant: lead cudzej agentúry (getLead ho nevráti) -> 404, nič sa neodošle", async () => {
    getCurrentProfileMock.mockResolvedValue({ id: "p-2", agency_id: "agency-B", email: "b@b.sk" });
    getLeadMock.mockResolvedValue(undefined);
    const { response } = await callRoute();
    expect(response.status).toBe(404);
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it("(c) tenant: používateľ bez agentúry mimo demo režimu -> 403, nič sa neodošle", async () => {
    getCurrentProfileMock.mockResolvedValue({ id: "p-3", agency_id: null, email: "c@c.sk" });
    const { response } = await callRoute();
    expect(response.status).toBe(403);
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it("(c) tenant: audit nesie agentúru volajúceho, nie hodnotu z tela požiadavky", async () => {
    await callRoute({ ...BODY, agencyId: "agency-B" });
    expect(logAiActionMock.mock.calls[0][0]).toMatchObject({ agencyId: "agency-A" });
  });

  it("demo režim: kill switch blokuje aj demo odoslanie", async () => {
    process.env.AGENT_KILL_SWITCH = "1";
    readDemoModeMock.mockResolvedValue(true);
    getCurrentProfileMock.mockResolvedValue(null);
    const { response } = await callRoute();
    expect(response.status).toBe(503);
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it("neprihlásený -> 401, nič sa neodošle", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const { response } = await callRoute();
    expect(response.status).toBe(401);
    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});
