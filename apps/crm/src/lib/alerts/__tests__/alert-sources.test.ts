/**
 * Founder Alert Adapter v0.2 — zdroje alertov.
 *
 * v0.1 postavila Router. v0.2 naň napojila päť ciest, ktoré dovtedy posielali
 * voľný text priamo na Slack webhook. Tieto testy držia dve veci:
 *
 *   1. každá cesta posiela cez `routeAlert`, nie priamym fetchom,
 *   2. do alertu sa NEDOSTANE obsah — telefón, meno autora, telo chyby.
 *
 * Bod 2 je ten dôležitý. Router skladá text z `fields`, takže čokoľvek, čo
 * volajúci do `fields` vloží, sa k founderovi dostane.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routeAlertMock = vi.hoisted(() =>
  vi.fn((..._args: unknown[]) => Promise.resolve({ routed: true, deliveries: [] })),
);
const createClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/alerts/router", () => ({
  routeAlert: (...args: unknown[]) => routeAlertMock(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

// revolisGuard je autentifikácia, nie predmet týchto testov — púšťame handler.
vi.mock("@/lib/revolis-guard", () => ({
  revolisGuard: async (_req: unknown, _name: string, handler: () => Promise<Response>) => handler(),
}));

const PHONE = "+421901234567";
const AUTHOR = "Jana Kováčová";

function guardedRequest(path: string, method = "GET", body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** Všetok text, ktorý by sa z eventu mohol dostať k founderovi. */
function payloadText(call: unknown): string {
  return JSON.stringify(call);
}

beforeEach(() => {
  routeAlertMock.mockClear();
  createClientMock.mockReset();
});

describe("outreach → Router", () => {
  function mockLeads(count: number) {
    const leads = Array.from({ length: count }, (_, i) => ({
      id: `lead-${i}`,
      region: "Bratislava",
      price: 199000,
      phone: PHONE,
      status: "SEGMENTED",
      segment: "A",
    }));
    createClientMock.mockResolvedValue({
      from: () => ({
        select: () => ({ eq: () => ({ eq: async () => ({ data: leads, error: null }) }) }),
        upsert: async () => ({ error: null }),
      }),
    });
  }

  it("posiela JEDEN agregovaný alert aj pri viacerých leadoch", async () => {
    mockLeads(7);
    const { GET } = await import("@/app/api/outreach/route");
    await GET(guardedRequest("/api/outreach") as never);

    expect(routeAlertMock).toHaveBeenCalledTimes(1);
    expect(routeAlertMock.mock.calls[0]?.[0]).toMatchObject({
      type: "HOT_LEADS",
      severity: "WARNING",
      fields: { pocet: "7", segment: "A" },
    });
  });

  it("telefónne číslo sa do alertu NEDOSTANE", async () => {
    mockLeads(3);
    const { GET } = await import("@/app/api/outreach/route");
    await GET(guardedRequest("/api/outreach") as never);

    expect(payloadText(routeAlertMock.mock.calls[0])).not.toContain(PHONE);
    expect(payloadText(routeAlertMock.mock.calls[0])).not.toContain("phone");
  });
});

describe("social-scout → Router", () => {
  beforeEach(() => {
    createClientMock.mockResolvedValue({
      from: () => ({
        insert: () => ({
          select: () => ({ single: async () => ({ data: { id: "lead-42" }, error: null }) }),
        }),
      }),
    });
  });

  it("posiela leadId a platformu, nie meno autora ani jeho text", async () => {
    const { POST } = await import("@/app/api/agents/social-scout/route");
    await POST(
      guardedRequest("/api/agents/social-scout", "POST", {
        platform: "facebook",
        author: AUTHOR,
        content: "Hľadám 3-izbový byt, volajte mi prosím.",
        link: "https://facebook.com/post/1",
        title: "Dopyt",
      }) as never,
    );

    expect(routeAlertMock).toHaveBeenCalledTimes(1);
    const call = payloadText(routeAlertMock.mock.calls[0]);
    expect(call).toContain("lead-42");
    expect(call).not.toContain(AUTHOR);
    expect(call).not.toContain("Hľadám 3-izbový byt");
  });
});

describe("night-watch → Router", () => {
  it("je EVENT (nie incident) a nenesie vymyslenú hodnotu v eurách", async () => {
    createClientMock.mockResolvedValue({
      from: () => ({
        select: () => ({
          gte: async () => ({
            data: [
              { status: "SMS_DRAFTED", source: "facebook" },
              { status: "NEW", source: "web" },
            ],
            error: null,
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/cron/night-watch/route");
    await GET(guardedRequest("/api/cron/night-watch") as never);

    expect(routeAlertMock).toHaveBeenCalledTimes(1);
    expect(routeAlertMock.mock.calls[0]?.[0]).toMatchObject({
      type: "NIGHT_WATCH_SUMMARY",
      severity: "EVENT",
      fields: { novePrilezitosti: "2", zoSocialnychSieti: "1", pripraveneSms: "1" },
    });
    expect(payloadText(routeAlertMock.mock.calls[0])).not.toContain("tisícov eur");
  });
});

describe("competitor-watch — nepripojený zdroj", () => {
  it("neposiela žiadny alert, kým zdroj dát neexistuje", async () => {
    const { GET } = await import("@/app/api/agents/competitor-watch/route");
    const response = await GET(guardedRequest("/api/agents/competitor-watch") as never);
    const json = await response.json();

    expect(routeAlertMock).not.toHaveBeenCalled();
    expect(json).toMatchObject({ state: "not_connected", alerts_sent: 0 });
  });
});

describe("hranica vrstvy — Router je jediná cesta von", () => {
  const SRC = join(__dirname, "..", "..", "..");

  function walk(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === ".next") continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full, acc);
      else if (/\.(ts|tsx|js|jsx)$/.test(entry)) acc.push(full);
    }
    return acc;
  }

  it("mimo lib/alerts/ nikto nesiaha priamo na SLACK_WEBHOOK_URL", () => {
    const offenders = walk(SRC)
      .filter((file) => !file.includes(join("lib", "alerts")))
      .filter((file) => readFileSync(file, "utf8").includes("SLACK_WEBHOOK_URL"))
      .map((file) => file.slice(SRC.length + 1));

    expect(offenders).toEqual([]);
  });

  it("starý helper lib/slack nemá žiadneho importéra", () => {
    const importers = walk(SRC)
      .filter((file) => /from ["']@\/lib\/slack["']/.test(readFileSync(file, "utf8")))
      .map((file) => file.slice(SRC.length + 1));

    expect(importers).toEqual([]);
  });
});
