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
 * 401 na /api/onboarding/session pre neprihláseného je ZÁMER, nie regresia.
 * Founder GO 2026-09-17 → .ai/bus/decisions/DEC-20260917-003-a3-onboarding-401-intended.md
 * Endpoint používa service role a obchádza RLS; form_data obsahuje osobné údaje
 * (name/phone/linkedin/bio), preto zostáva za session bránou.
 * Ak tento test spadne, niekto endpoint sprístupnil anonymne — to vyžaduje founderovo
 * rozhodnutie (varianty V2–V5 v docs/reports/2026-09-17-a3-onboarding-session-401-finding.md).
 */
describe("onboarding session endpoint stays behind the session gate", () => {
  beforeEach(() => {
    getUser.mockReset();
  });

  it("returns 401 for an anonymous GET", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const res = await proxy(request(SESSION_PATH));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "Unauthorized" });
  });

  it("returns 401 for an anonymous POST", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const res = await proxy(request("/api/onboarding/session", "POST"));

    expect(res.status).toBe(401);
  });

  it("lets the request through to the route handler when a user is signed in", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const res = await proxy(request(SESSION_PATH));

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  // Kontrola, že test meria bránu a nie "všetko je 401": skutočne verejná API cesta prejde.
  it("does not gate a genuinely public API path", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const res = await proxy(request("/api/healthz"));

    expect(res.status).toBe(200);
  });

  // Sesterské onboarding routes sa nesmú otvoriť ako vedľajší efekt prefixu.
  it("keeps sibling onboarding API routes gated as well", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const res = await proxy(request("/api/onboarding/mvp/checklist"));

    expect(res.status).toBe(401);
  });
});
