import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJsonWithRetry } from "@/lib/request-helpers";

function mockResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("fetchJsonWithRetry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not retry non-retryable 4xx statuses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(400, { error: "bad request" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchJsonWithRetry("/api/test", { method: "POST" }, { retries: 2 })).rejects.toThrow("bad request");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries transient server errors and eventually succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockResponse(503, { error: "temporary outage" }))
      .mockResolvedValueOnce(mockResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const data = await fetchJsonWithRetry("/api/test", { method: "POST" }, { retries: 2, backoffMs: 1 });
    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries network errors up to configured attempts", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("network down")).mockResolvedValueOnce(mockResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const data = await fetchJsonWithRetry("/api/test", { method: "POST" }, { retries: 2, backoffMs: 1 });
    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
