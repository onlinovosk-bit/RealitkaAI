import { describe, expect, it } from "vitest";
import {
  validateListQuery,
  validateScheduledEventInput,
  validateScheduledEventUpdate,
} from "../validation";

describe("validateScheduledEventInput", () => {
  it("accepts minimal viewing payload", () => {
    const result = validateScheduledEventInput({
      title: "Obhliadka — Kováč",
      startsAt: "2026-06-01T10:00:00.000Z",
      endsAt: "2026-06-01T11:00:00.000Z",
      leadId: "lead-1",
      eventType: "viewing",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.eventType).toBe("viewing");
      expect(result.value.timezone).toBe("Europe/Bratislava");
    }
  });

  it("rejects endsAt before startsAt", () => {
    const result = validateScheduledEventInput({
      title: "Test",
      startsAt: "2026-06-01T12:00:00.000Z",
      endsAt: "2026-06-01T11:00:00.000Z",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects unknown eventType", () => {
    const result = validateScheduledEventInput({
      title: "Test",
      startsAt: "2026-06-01T10:00:00.000Z",
      endsAt: "2026-06-01T11:00:00.000Z",
      eventType: "party",
    });
    expect(result.ok).toBe(false);
  });
});

describe("validateScheduledEventUpdate", () => {
  it("requires at least one field", () => {
    const result = validateScheduledEventUpdate({});
    expect(result.ok).toBe(false);
  });

  it("accepts status cancel", () => {
    const result = validateScheduledEventUpdate({ status: "cancelled" });
    expect(result.ok).toBe(true);
  });
});

describe("validateListQuery", () => {
  it("parses date range and limit", () => {
    const params = new URLSearchParams({
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-30T23:59:59.000Z",
      limit: "50",
      status: "scheduled",
    });
    const result = validateListQuery(params);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.limit).toBe(50);
      expect(result.value.status).toBe("scheduled");
    }
  });

  it("rejects invalid limit", () => {
    const params = new URLSearchParams({ limit: "9999" });
    const result = validateListQuery(params);
    expect(result.ok).toBe(false);
  });
});
