import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

vi.mock("@/lib/usage-metrics", () => ({
  SYSTEM_USAGE_AGENCY_ID: "00000000-0000-0000-0000-000000000001",
}));

import {
  formatCriticalAlertEmail,
  formatUnreadDigestEmail,
  isNotificationDigestEnabled,
  runUnreadNotificationDigest,
} from "@/lib/infra/notification-delivery";

describe("notification-delivery formatting", () => {
  it("formats digest with counts and no invented fields", () => {
    const { subject, text } = formatUnreadDigestEmail({
      rows: [
        {
          id: "1",
          priority: "critical",
          title: "Heartbeat: Realvia/webhook: žiadna stopa 7+ dní",
          type: "ceo_command",
          created_at: "2026-09-04T07:53:00.000Z",
        },
        {
          id: "2",
          priority: "high",
          title: "Heartbeat: Guardian: žiadny beh 2h+",
          type: "ceo_command",
          created_at: "2026-09-04T06:00:00.000Z",
        },
      ],
    });
    expect(subject).toContain("2 neprečítaných");
    expect(subject).toContain("1 critical");
    expect(text).toContain("Realvia/webhook");
    expect(text).toContain("critical: 1");
  });

  it("formats critical alert with signal id", () => {
    const { subject, text } = formatCriticalAlertEmail({
      signalId: "realvia_webhook_stale_7d",
      title: "Realvia/webhook: žiadna stopa 7+ dní",
      detail: "prítok môže byť mŕtvy",
    });
    expect(subject).toContain("CRITICAL");
    expect(text).toContain("realvia_webhook_stale_7d");
    expect(text).toContain("prítok môže byť mŕtvy");
  });
});

describe("notification-delivery gates", () => {
  it("digest defaults enabled", () => {
    const prev = process.env.NOTIFICATION_DIGEST_ENABLED;
    delete process.env.NOTIFICATION_DIGEST_ENABLED;
    expect(isNotificationDigestEnabled()).toBe(true);
    process.env.NOTIFICATION_DIGEST_ENABLED = "false";
    expect(isNotificationDigestEnabled()).toBe(false);
    process.env.NOTIFICATION_DIGEST_ENABLED = prev;
  });
});

type EqFilter = { column: string; value: unknown };

function createDigestSupabaseMock(rows: Array<Record<string, unknown>>) {
  const selectEqs: EqFilter[] = [];
  const updateEqs: EqFilter[] = [];
  let updateCalled = false;

  const selectChain: Record<string, unknown> = {};
  selectChain.select = vi.fn(() => selectChain);
  selectChain.eq = vi.fn((column: string, value: unknown) => {
    selectEqs.push({ column, value });
    return selectChain;
  });
  selectChain.is = vi.fn(() => selectChain);
  selectChain.order = vi.fn(() => selectChain);
  selectChain.limit = vi.fn(async () => ({ data: rows, error: null }));

  const updateChain: Record<string, unknown> = {};
  updateChain.update = vi.fn(() => {
    updateCalled = true;
    return updateChain;
  });
  updateChain.eq = vi.fn((column: string, value: unknown) => {
    updateEqs.push({ column, value });
    return updateChain;
  });
  updateChain.in = vi.fn(() => updateChain);
  updateChain.is = vi.fn(async () => ({ error: null }));

  return {
    selectEqs,
    updateEqs,
    wasUpdated: () => updateCalled,
    from: vi.fn((table: string) => {
      expect(table).toBe("routine_notifications");
      return {
        select: selectChain.select,
        update: updateChain.update,
      };
    }),
  };
}

describe("runUnreadNotificationDigest tenant + send safety", () => {
  beforeEach(() => {
    sendMock.mockReset();
    process.env.RESEND_API_KEY = "re_test";
    process.env.FOUNDER_EMAILS = "founder@revolis.ai";
    delete process.env.NOTIFICATION_DIGEST_ENABLED;
  });

  it("scopes select/update to SYSTEM_USAGE_AGENCY_ID and marks read after send", async () => {
    sendMock.mockResolvedValue({ data: { id: "email_1" }, error: null });
    const supabase = createDigestSupabaseMock([
      {
        id: "platform-1",
        priority: "critical",
        title: "Heartbeat: triage dead",
        type: "ceo_command",
        created_at: "2026-09-05T07:00:00.000Z",
      },
    ]);

    const result = await runUnreadNotificationDigest(supabase as never);

    expect(result.sent).toBe(true);
    expect(result.markedRead).toBe(1);
    expect(supabase.selectEqs).toContainEqual({
      column: "agency_id",
      value: "00000000-0000-0000-0000-000000000001",
    });
    expect(supabase.updateEqs).toContainEqual({
      column: "agency_id",
      value: "00000000-0000-0000-0000-000000000001",
    });
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("does not mark read when Resend returns error", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "Invalid from address", name: "validation_error" },
    });
    const supabase = createDigestSupabaseMock([
      {
        id: "platform-1",
        priority: "critical",
        title: "Heartbeat: triage dead",
        type: "ceo_command",
        created_at: "2026-09-05T07:00:00.000Z",
      },
    ]);

    const result = await runUnreadNotificationDigest(supabase as never);

    expect(result.sent).toBe(false);
    expect(result.reason).toContain("Invalid from address");
    expect(result.markedRead).toBe(0);
    expect(supabase.wasUpdated()).toBe(false);
  });
});
