import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser },
  })),
}));

import { proxy } from "@/proxy";

function request(path: string, method = "GET") {
  return new NextRequest(new URL(path, "http://localhost"), { method });
}

const SESSION_ID = "8f1e6a2c-5c1b-4f0e-9c3a-7b2d1e4f6a90";
const SESSION_PATH = `/api/onboarding/session?session_id=${SESSION_ID}`;

/**
 * `/api/onboarding/session` je ZÁMERNE verejná cesta.
 *
 * POZOR — tento súbor tvrdil do 2026-09-17 presný opak. Pôvodný kontrakt
 * (`DEC-20260917-003`) hovoril, že anonymné 401 je zámer, lebo endpoint beží
 * cez service role a `form_data` nesie osobné údaje. Founder to rozhodnutie
 * **nahradil** v #574 („public onboarding wizard sync must work without
 * login") a `DEC-20260917-005` to zaznamenáva.
 *
 * Bezpečnostný model sa tým nezrušil, iba presunul: prístup už nechráni session
 * brána, ale **neuhádnuteľnosť `session_id`** (`uuidv4`, 122 bitov entropie,
 * `useOnboarding.ts:101`) plus rate limit na IP v samotnej route
 * (`route.ts:40,90`). Je to capability-URL vzor.
 *
 * Preto tento test NIE JE oslabená verzia pôvodného. Otvorenie drží na uzde
 * troma spôsobmi:
 *   1. otvára sa PRESNE jedna cesta, nie prefix `/api/onboarding/`
 *   2. sesterské onboarding routes zostávajú za bránou
 *   3. `/api/healthz` slúži ako kontrola, že test meria bránu a nie „všetko 200"
 *
 * Ak sa niekedy otvorí `/api/onboarding/*` ako prefix, testy 2 a 3 spadnú.
 * Otvorené riziká vzoru: `docs/reports/2026-09-17-a3-onboarding-public-residual-risks.md`
 */
describe("onboarding session endpoint is intentionally public (DEC-20260917-005)", () => {
  beforeEach(() => {
    getUser.mockReset();
  });

  it("nechá prejsť anonymný GET — proxy už nevracia 401", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const res = await proxy(request(SESSION_PATH));

    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
  });

  it("nechá prejsť anonymný POST", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const res = await proxy(request("/api/onboarding/session", "POST"));

    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
  });

  it("prihlásený používateľ prejde rovnako a nikam sa nepresmeruje", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const res = await proxy(request(SESSION_PATH));

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  // Kontrola, že test meria bránu a nie "všetko prejde": skutočne verejná cesta prejde.
  it("nebráni ani inej skutočne verejnej API ceste", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const res = await proxy(request("/api/healthz"));

    expect(res.status).toBe(200);
  });

  // HRANICA OTVORENIA — sesterské routes sa nesmú otvoriť ako vedľajší efekt.
  it("sesterské onboarding API routes zostávajú za bránou", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const res = await proxy(request("/api/onboarding/mvp/checklist"));

    expect(res.status).toBe(401);
  });

  // HRANICA OTVORENIA — otvorená je PRESNE táto cesta, nie prefix pod ňou.
  it.each([
    "/api/onboarding/session/list",
    "/api/onboarding/session/all",
    "/api/onboarding/sessions",
  ])("cesta %s NIE JE otvorená — otvára sa presná cesta, nie prefix", async (path) => {
    getUser.mockResolvedValue({ data: { user: null } });

    const res = await proxy(request(path));

    expect(res.status).toBe(401);
  });
});
