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

/** GO-W3-SHIP 2026-09-17 — Concierge public paths. */
describe("concierge API paths are public (GO-W3-SHIP)", () => {
  beforeEach(() => {
    getUser.mockReset();
    getUser.mockResolvedValue({ data: { user: null } });
  });

  it.each([
    "/api/concierge/properties",
    "/api/concierge/callback",
    "/api/concierge/freebusy",
  ])("%s allows anonymous (no 401 from proxy)", async (path) => {
    const res = await proxy(request(path, path.includes("callback") ? "POST" : "GET"));
    expect(res.status).not.toBe(401);
  });
});
