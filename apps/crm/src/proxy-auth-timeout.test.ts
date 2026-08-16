import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser },
  })),
}));

import {
  PROXY_AUTH_TIMEOUT_MARKER,
  isProxyAuthTimeoutError,
  proxy,
} from "@/proxy";

function request(path: string) {
  return new NextRequest(new URL(path, "http://localhost"));
}

describe("isProxyAuthTimeoutError", () => {
  it("matches AbortError and TimeoutError", () => {
    const abort = new Error("aborted");
    abort.name = "AbortError";
    const timeout = new Error("timeout");
    timeout.name = "TimeoutError";
    expect(isProxyAuthTimeoutError(abort)).toBe(true);
    expect(isProxyAuthTimeoutError(timeout)).toBe(true);
    expect(isProxyAuthTimeoutError(new Error("nope"))).toBe(false);
  });
});

describe("proxy auth timeout", () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

  beforeEach(() => {
    getUser.mockReset();
    errorSpy.mockClear();
  });

  afterEach(() => {
    errorSpy.mockClear();
  });

  it("fail-opens and logs the marker when getUser times out", async () => {
    const timeout = new Error("The operation was aborted due to timeout");
    timeout.name = "TimeoutError";
    getUser.mockRejectedValue(timeout);

    const res = await proxy(request("/dashboard"));

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    const logged = errorSpy.mock.calls.map((call) => call.map(String).join(" ")).join(" ");
    expect(logged).toContain(PROXY_AUTH_TIMEOUT_MARKER);
  });

  it("still returns 401 for API routes when there is no user", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await proxy(request("/api/leads"));
    expect(res.status).toBe(401);
  });

  it("still redirects dashboard pages when there is no user", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await proxy(request("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });
});
