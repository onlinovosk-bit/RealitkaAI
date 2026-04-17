import { describe, expect, it } from "vitest";
import { createSlidingWindowLimiter, getClientIpFromRequest } from "../rate-limit";

describe("createSlidingWindowLimiter", () => {
  it("allows requests up to max within window", () => {
    const check = createSlidingWindowLimiter({ windowMs: 60_000, max: 3 });
    expect(check("a").ok).toBe(true);
    expect(check("a").ok).toBe(true);
    expect(check("a").ok).toBe(true);
    const fourth = check("a");
    expect(fourth.ok).toBe(false);
    if (!fourth.ok) expect(fourth.retryAfterSec).toBeGreaterThan(0);
  });

  it("tracks keys independently", () => {
    const check = createSlidingWindowLimiter({ windowMs: 60_000, max: 1 });
    expect(check("u1").ok).toBe(true);
    expect(check("u2").ok).toBe(true);
  });
});

describe("getClientIpFromRequest", () => {
  it("reads first x-forwarded-for", () => {
    const r = new Request("https://x.test/a", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(getClientIpFromRequest(r)).toBe("203.0.113.1");
  });
});
