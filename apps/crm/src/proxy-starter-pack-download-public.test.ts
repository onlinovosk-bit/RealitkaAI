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
 * Fulfillment email posiela /api/starter-pack/download?token=… kupujúcemu bez
 * CRM session. Route autentifikuje HMAC + purchase row — proxy musí cestu
 * pustiť anonymne, inak 401 pred handlerom = nedoručený zaplatený balík.
 */
describe("starter-pack download is public (token-gated)", () => {
  beforeEach(() => {
    getUser.mockReset();
    getUser.mockResolvedValue({ data: { user: null } });
  });

  it("GET /api/starter-pack/download prejde anonymne (no 401 from proxy)", async () => {
    const res = await proxy(
      request("/api/starter-pack/download?token=payload.sig", "GET"),
    );
    expect(res.status).toBe(200);
  });

  it.each([
    "/api/starter-pack",
    "/api/starter-pack/download/other",
    "/api/billing/redeem-code",
  ])("sesterská cesta %s zostáva za bránou (401)", async (path) => {
    const res = await proxy(request(path, "GET"));
    expect(res.status).toBe(401);
  });
});
