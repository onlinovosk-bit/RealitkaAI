import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser } })),
}));

import { proxy } from "@/proxy";

const request = (path: string, method = "GET") =>
  new NextRequest(new URL(path, "http://localhost"), { method });

/**
 * Nález F-02: proxy zahadzovala 401 volania, ktoré prichádzajú bez session —
 * Resend webhook, odhlasovací odkaz, sledovacie pixely. Verejných je PRESNE päť
 * ciest; sesterské cesty zostávajú za bránou.
 */
describe("deliverability endpoints are public (EMAIL-SUPPRESSION-01)", () => {
  beforeEach(() => {
    getUser.mockReset();
    getUser.mockResolvedValue({ data: { user: null } });
  });

  it.each([
    ["POST", "/api/resend-webhook"],
    ["GET", "/api/unsubscribe?t=x"],
    ["POST", "/api/unsubscribe?t=x"],
    ["GET", "/api/notifications/unsubscribe?profile=x"],
    ["GET", "/api/morning-brief/track/open?id=x"],
    ["GET", "/api/morning-brief/track/click?brief=x&lead=y"],
  ])("%s %s prejde anonymne", async (method, path) => {
    const res = await proxy(request(path, method));
    expect(res.status).toBe(200);
  });

  it.each([
    "/api/resend-webhook/other",
    "/api/unsubscribe/all",
    "/api/notifications/settings",
    "/api/morning-brief/track/other",
    "/api/outreach/send",
  ])("sesterská cesta %s zostáva za bránou (401)", async (path) => {
    const res = await proxy(request(path, "POST"));
    expect(res.status).toBe(401);
  });
});
