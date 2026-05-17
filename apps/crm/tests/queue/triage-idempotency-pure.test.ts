import { describe, expect, it } from "vitest";

import {
  DEFAULT_TRIAGE_STALE_MS,
  isStaleLock,
  utcCalendarDay,
} from "@/ai/triage-idempotency";

describe("utcCalendarDay", () => {
  it("returns YYYY-MM-DD in UTC", () => {
    const d = new Date(Date.UTC(2026, 4, 14, 15, 30, 0));
    expect(utcCalendarDay(d)).toBe("2026-05-14");
  });
});

describe("isStaleLock", () => {
  it("returns false when within stale window", () => {
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);
    const started = new Date(now - 60_000).toISOString();
    expect(isStaleLock(started, now, DEFAULT_TRIAGE_STALE_MS)).toBe(false);
  });

  it("returns true when older than stale window", () => {
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);
    const started = new Date(now - DEFAULT_TRIAGE_STALE_MS - 1).toISOString();
    expect(isStaleLock(started, now, DEFAULT_TRIAGE_STALE_MS)).toBe(true);
  });
});
