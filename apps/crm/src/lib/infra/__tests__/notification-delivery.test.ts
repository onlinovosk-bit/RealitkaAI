import { describe, expect, it } from "vitest";
import {
  formatCriticalAlertEmail,
  formatUnreadDigestEmail,
  isNotificationDigestEnabled,
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
