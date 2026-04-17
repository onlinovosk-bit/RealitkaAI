import { afterEach, describe, expect, it, vi } from "vitest";

describe("validateTranscribeFileSize", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("rejects when over configured max", async () => {
    vi.stubEnv("CALL_TRANSCRIBE_MAX_BYTES", "500");
    const { validateTranscribeFileSize } = await import("../call-transcribe-limits");
    const r = validateTranscribeFileSize(501);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/príliš veľký/i);
  });

  it("allows at or under max", async () => {
    vi.stubEnv("CALL_TRANSCRIBE_MAX_BYTES", "500");
    const { validateTranscribeFileSize } = await import("../call-transcribe-limits");
    expect(validateTranscribeFileSize(500).ok).toBe(true);
    expect(validateTranscribeFileSize(1).ok).toBe(true);
  });
});
