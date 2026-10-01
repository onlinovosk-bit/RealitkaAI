/**
 * revolisGuard — chybová vetva ide cez Router.
 *
 * Doteraz guard posielal `error.message` priamo na Slack webhook. Text chyby je
 * obsah, nie identifikátor: PostgREST vracia v správe aj hodnoty z dopytu, takže
 * do externého kanála mohol pretiecť e-mail, telefón alebo riadok z DB.
 *
 * Kontrakt po v0.2: telo chyby ostáva v server logu, do alertu ide typ chyby.
 */

import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routeAlertMock = vi.hoisted(() =>
  vi.fn((..._args: unknown[]) => Promise.resolve({ routed: true, deliveries: [] })),
);

vi.mock("@/lib/alerts/router", () => ({
  routeAlert: (...args: unknown[]) => routeAlertMock(...args),
}));

const SECRET = "test-cron-secret";
const PATH = "/api/cron/night-watch";
const LEAKY_MESSAGE = 'duplicate key value violates unique constraint "leads_email_key" (jana@example.sk)';

function signedRequest(): NextRequest {
  const ts = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", SECRET).update(`${ts}.${PATH}`).digest("hex");
  return new NextRequest(`http://localhost${PATH}`, {
    headers: { "x-revolis-timestamp": ts, "x-revolis-signature": signature },
  });
}

beforeEach(() => {
  routeAlertMock.mockClear();
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("revolisGuard — zlyhanie handlera", () => {
  it("pošle CRITICAL alert cez Router s typom chyby, nie s jej telom", async () => {
    const { revolisGuard } = await import("@/lib/revolis-guard");

    const response = await revolisGuard(signedRequest(), "NightWatch Agent", async () => {
      throw new TypeError(LEAKY_MESSAGE);
    });

    expect(response.status).toBe(500);
    expect(routeAlertMock).toHaveBeenCalledTimes(1);

    const event = routeAlertMock.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(event).toMatchObject({
      type: "AGENT_ERROR",
      severity: "CRITICAL",
      agent: "revolis-guard",
      dedupKey: "agent-error:NightWatch Agent",
      actionRequired: true,
      fields: { uloha: "NightWatch Agent", typChyby: "TypeError" },
    });

    // Toto je jadro testu: telo chyby sa do alertu nesmie dostať nikade.
    expect(JSON.stringify(event)).not.toContain("jana@example.sk");
    expect(JSON.stringify(event)).not.toContain("leads_email_key");
  });

  it("úspešný handler žiadny alert neposiela", async () => {
    const { revolisGuard } = await import("@/lib/revolis-guard");

    const response = await revolisGuard(signedRequest(), "NightWatch Agent", async () =>
      NextResponse.json({ ok: true }),
    );

    expect(response.status).toBe(200);
    expect(routeAlertMock).not.toHaveBeenCalled();
  });
});
