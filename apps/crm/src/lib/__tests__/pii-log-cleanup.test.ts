import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());
const profilesRows = vi.hoisted(() => ({ rows: [] as Array<{ email: string; full_name: string }> }));
const chain = vi.hoisted(() => ({
  data: null as unknown,
  error: null as unknown,
}));

vi.mock("@/lib/supabase/resolve-client", () => ({
  resolveTenantSupabase: async () => ({
    from: () => ({
      update: () => ({ eq: () => ({ select: async () => ({ data: chain.data, error: chain.error }) }) }),
    }),
  }),
}));
vi.mock("@/lib/demo-mode-cookie", () => ({ readDemoModeFromCookie: async () => false }));
vi.mock("@/lib/permissions", () => ({ requireRole: async () => ({ id: "founder-1" }) }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => ({ allowed: true }) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: async () => ({ data: profilesRows.rows }) }) }),
  }),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: (...a: unknown[]) => sendMock(...a) };
  },
}));

import { updateAiRecommendation } from "../leads-store";
import { POST as sendLegal } from "@/app/api/founder/send-legal-update-email/route";

let log: ReturnType<typeof vi.spyOn>;
let err: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  err = vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

const allLogged = () => JSON.stringify([...log.mock.calls, ...err.mock.calls]);

describe("updateAiRecommendation", () => {
  it("nelogí payload ani riadok z DB", async () => {
    chain.error = null;
    chain.data = [{ id: "r1", lead_id: "l1", title: "Zavolať Jan Novak", description: "jan@example.sk" }];
    await updateAiRecommendation("r1", { title: "Zavolať Jan Novak" }).catch(() => undefined);
    expect(allLogged()).not.toContain("Novak");
    expect(allLogged()).not.toContain("jan@example.sk");
  });

  it("chyba pri neočakávanom tvare dát neobsahuje samotné dáta", async () => {
    chain.error = null;
    chain.data = [{ title: "Jan Novak", description: "jan@example.sk" }, { title: "druhý" }];
    const e = await updateAiRecommendation("r1", { title: "x" }).catch((x: Error) => x);
    expect(String((e as Error).message)).not.toContain("Novak");
    expect(String((e as Error).message)).not.toContain("jan@example.sk");
  });
});

describe("POST /api/founder/send-legal-update-email", () => {
  it("pri zlyhaní odoslania nedá e-mail príjemcu do logu", async () => {
    profilesRows.rows = [{ email: "owner@kancelaria.sk", full_name: "Peter" }];
    sendMock.mockRejectedValue(new Error("smtp down"));
    const res = await sendLegal();
    expect((await res.json()).sent).toBe(0);
    expect(allLogged()).not.toContain("owner@kancelaria.sk");
    expect(allLogged()).toContain("smtp down");
  });
});
