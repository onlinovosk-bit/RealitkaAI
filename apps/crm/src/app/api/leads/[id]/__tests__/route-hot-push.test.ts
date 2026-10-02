/**
 * LEAD-PIPELINE-AFTER (hot-lead push): `PATCH /api/leads/[id]` pri zmene stavu na „Horúci" musí push
 * pre makléra dobehnúť PO odoslaní odpovede, nie ako `notifyHotLead(...).catch(...)` bez `await`.
 *
 * Prečo: na Verceli sa funkcia po odoslaní odpovede zmrazí, takže nečakaný push ticho nedobehol
 * (rovnaká trieda chyby ako triáž leadu, viď lib/acquire/after-response.ts). PROD má push odberateľov
 * (8 odberov, 2 používatelia), takže výpadok nie je teoretický.
 *
 * `after` z `next/server` sa tu zachytáva, aby sa dalo dokázať poradie: v čase, keď PATCH vráti odpoveď,
 * push ešte nebežal; spustí sa až zachytený callback.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  profileRow: vi.fn(),
  leadRow: vi.fn(),
  getLead: vi.fn(),
  updateLead: vi.fn(),
  createActivity: vi.fn(),
  autoRecalculateForLead: vi.fn(),
  rescoreLead: vi.fn(),
  notifyHotLead: vi.fn(),
  emit: vi.fn(),
  scheduled: [] as Array<() => unknown>,
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (cb: () => unknown) => {
      mocks.scheduled.push(cb);
    },
  };
});
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/leads-store", () => ({
  getLead: mocks.getLead,
  updateLead: mocks.updateLead,
  deleteLead: vi.fn(),
}));
vi.mock("@/lib/activities-store", () => ({ createActivity: mocks.createActivity }));
vi.mock("@/lib/matching-hooks", () => ({ autoRecalculateForLead: mocks.autoRecalculateForLead }));
vi.mock("@/lib/rescore-lead", () => ({ rescoreLead: mocks.rescoreLead }));
vi.mock("@/services/push/PushNotificationService", () => ({ notifyHotLead: mocks.notifyHotLead }));
vi.mock("@/infra/messaging/EventBus", () => ({ globalEventBus: { emit: mocks.emit } }));

import { PATCH } from "../route";

const AGENCY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const LEAD_ID = "dddddddd-dddd-4ddd-8ddd-dddddddd0004";
const PROFILE = "pppppppp-pppp-4ppp-8ppp-pppppppp0005";
const params = Promise.resolve({ id: LEAD_ID });

function patch() {
  return PATCH(
    new Request(`http://localhost/api/leads/${LEAD_ID}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "Horúci" }),
    }),
    { params },
  );
}

async function runScheduled() {
  const jobs = mocks.scheduled.splice(0);
  for (const job of jobs) await job();
}

function updatedLead(over: Record<string, unknown> = {}) {
  return { id: LEAD_ID, name: "Klient", status: "Horúci", assignedProfileId: PROFILE, ...over };
}

describe("PATCH /api/leads/[id] — push pre Horúci lead dobehne po odpovedi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.scheduled.length = 0;
    mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-user-1" } } });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
      from: (table: string) => ({
        select: () => ({
          eq: () => ({ maybeSingle: table === "profiles" ? mocks.profileRow : mocks.leadRow }),
        }),
      }),
    });
    mocks.profileRow.mockResolvedValue({ data: { agency_id: AGENCY } });
    mocks.leadRow.mockResolvedValue({ data: { agency_id: AGENCY, created_at: null } });
    mocks.getLead.mockResolvedValue({ id: LEAD_ID, name: "Klient", status: "Novy" });
    mocks.updateLead.mockResolvedValue(updatedLead());
    mocks.createActivity.mockResolvedValue(undefined);
    mocks.autoRecalculateForLead.mockResolvedValue(undefined);
    mocks.rescoreLead.mockResolvedValue(undefined);
    mocks.notifyHotLead.mockResolvedValue({ sent: 1 });
    mocks.emit.mockResolvedValue(undefined);
  });

  it("v čase odpovede push ešte nebežal; naplánovaný krok ho spustí s maklérom, menom a ID", async () => {
    const res = await patch();
    expect(res.status).toBe(200);

    expect(mocks.notifyHotLead).not.toHaveBeenCalled();
    expect(mocks.scheduled.length).toBeGreaterThan(0);

    await runScheduled();
    expect(mocks.notifyHotLead).toHaveBeenCalledTimes(1);
    expect(mocks.notifyHotLead).toHaveBeenCalledWith(PROFILE, "Klient", LEAD_ID);
  });

  it("pád pushu nepokazí odpoveď ani nehádže z naplánovaného kroku", async () => {
    mocks.notifyHotLead.mockRejectedValue(new Error("web-push 410"));
    const res = await patch();
    expect(res.status).toBe(200);
    await expect(runScheduled()).resolves.toBeUndefined();
    expect(mocks.notifyHotLead).toHaveBeenCalledTimes(1);
  });

  it("bez priradeného makléra sa push neposiela", async () => {
    mocks.updateLead.mockResolvedValue(updatedLead({ assignedProfileId: null }));
    expect((await patch()).status).toBe(200);
    await runScheduled();
    expect(mocks.notifyHotLead).not.toHaveBeenCalled();
  });

  it("zmena na iný stav ako Horúci push nespúšťa", async () => {
    mocks.updateLead.mockResolvedValue(updatedLead({ status: "Kontaktovaný" }));
    expect((await patch()).status).toBe(200);
    await runScheduled();
    expect(mocks.notifyHotLead).not.toHaveBeenCalled();
  });

  it("lead, ktorý už Horúci bol, push znova nespúšťa", async () => {
    mocks.getLead.mockResolvedValue({ id: LEAD_ID, name: "Klient", status: "Horúci" });
    expect((await patch()).status).toBe(200);
    await runScheduled();
    expect(mocks.notifyHotLead).not.toHaveBeenCalled();
  });
});
