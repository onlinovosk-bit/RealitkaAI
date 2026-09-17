import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserMock = vi.fn();
const getLeadMock = vi.fn();
const sendMessageMock = vi.fn();
const readDemoModeMock = vi.fn();
const createClientMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));
vi.mock("@/lib/leads-store", () => ({
  getLead: (...args: unknown[]) => getLeadMock(...args),
}));
vi.mock("@/lib/multi-channel-sender", () => ({
  sendMessage: (...args: unknown[]) => sendMessageMock(...args),
}));
vi.mock("@/lib/demo-mode-cookie", () => ({
  readDemoModeFromCookie: () => readDemoModeMock(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createClientMock(),
}));

const SCOPED = { marker: "scoped-client" };

function post(body: Record<string, unknown>): Request {
  return new Request("https://crm.local/api/playbook/confirm-viewing", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function callRoute(body: Record<string, unknown>) {
  const { POST } = await import("@/app/api/playbook/confirm-viewing/route");
  const response = await POST(post(body));
  return { response, json: await response.json() };
}

describe("POST /api/playbook/confirm-viewing — never confirms to a fixture contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    createClientMock.mockResolvedValue(SCOPED);
    readDemoModeMock.mockResolvedValue(false);
    sendMessageMock.mockResolvedValue({ ok: true });
  });

  it("passes the request-scoped client into getLead", async () => {
    getLeadMock.mockResolvedValue({
      id: "lead-1",
      name: "Jana Nová",
      email: "jana@example.sk",
      phone: "+421900111222",
    });

    await callRoute({
      leadId: "lead-1",
      playbookItemId: "viewing-today-1",
      subtitle: "Zajtra o 15:00",
    });

    expect(getLeadMock).toHaveBeenCalledWith("lead-1", SCOPED);
  });

  it("sends to the real lead contact", async () => {
    getLeadMock.mockResolvedValue({
      id: "lead-1",
      name: "Jana Nová",
      email: "jana@example.sk",
      phone: "+421900111222",
    });

    const { json } = await callRoute({
      leadId: "lead-1",
      playbookItemId: "viewing-today-1",
      subtitle: "Zajtra o 15:00",
    });

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock.mock.calls[0][0]).toMatchObject({
      channel: "email",
      to: "jana@example.sk",
    });
    expect(JSON.stringify(json)).not.toContain("lucia.demo@revolis.ai");
  });

  it("404s instead of falling back to the demo contact when the lead is not visible", async () => {
    getLeadMock.mockResolvedValue(undefined);

    const { response, json } = await callRoute({
      leadId: "lead-of-another-agency",
      playbookItemId: "viewing-today-1",
      subtitle: "Zajtra o 15:00",
    });

    expect(response.status).toBe(404);
    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(JSON.stringify(json)).not.toContain("lucia.demo@revolis.ai");
    expect(JSON.stringify(json)).not.toContain("+421901112233");
  });

  it("never substitutes the fixture contact for a real lead with no email or phone", async () => {
    getLeadMock.mockResolvedValue({
      id: "lead-2",
      name: "Bez kontaktu",
      email: "",
      phone: "",
    });

    const { response, json } = await callRoute({
      leadId: "lead-2",
      playbookItemId: "viewing-today-1",
      subtitle: "Zajtra o 15:00",
    });

    expect(response.status).toBe(400);
    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(JSON.stringify(json)).not.toContain("lucia.demo@revolis.ai");
    expect(JSON.stringify(json)).not.toContain("+421901112233");
  });

  it("still uses the fixture contact in demo mode", async () => {
    readDemoModeMock.mockResolvedValue(true);
    getLeadMock.mockResolvedValue(undefined);

    const { json } = await callRoute({
      leadId: "mock-lucia",
      playbookItemId: "viewing-today-1",
      subtitle: "Zajtra o 15:00",
    });

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock.mock.calls[0][0]).toMatchObject({
      to: "lucia.demo@revolis.ai",
    });
    expect(json).toBeTruthy();
  });
});
