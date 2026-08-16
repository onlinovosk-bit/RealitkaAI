import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SUPABASE_FETCH_TIMEOUT_MS,
  fetchWithTimeout,
  getSupabaseFetchTimeoutMs,
} from "@/lib/supabase/fetch-timeout";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getSupabaseFetchTimeoutMs", () => {
  it("defaults to 8000 ms", () => {
    vi.stubEnv("SUPABASE_FETCH_TIMEOUT_MS", "");
    expect(getSupabaseFetchTimeoutMs()).toBe(DEFAULT_SUPABASE_FETCH_TIMEOUT_MS);
  });

  it("honors a positive env override", () => {
    vi.stubEnv("SUPABASE_FETCH_TIMEOUT_MS", "2500");
    expect(getSupabaseFetchTimeoutMs()).toBe(2500);
  });

  it("ignores invalid env values", () => {
    vi.stubEnv("SUPABASE_FETCH_TIMEOUT_MS", "nope");
    expect(getSupabaseFetchTimeoutMs()).toBe(DEFAULT_SUPABASE_FETCH_TIMEOUT_MS);
  });
});

describe("fetchWithTimeout", () => {
  it("passes through a successful fetch", async () => {
    const response = new Response("ok", { status: 200 });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWithTimeout("https://example.test/auth");

    expect(result).toBe(response);
    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("aborts when the timeout fires", async () => {
    vi.stubEnv("SUPABASE_FETCH_TIMEOUT_MS", "20");
    vi.stubGlobal("fetch", (_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const reason = init.signal?.reason;
          reject(reason instanceof Error ? reason : new DOMException("Aborted", "AbortError"));
        });
      });
    });

    await expect(fetchWithTimeout("https://example.test/hang")).rejects.toMatchObject({
      name: expect.stringMatching(/AbortError|TimeoutError/),
    });
  });
});
