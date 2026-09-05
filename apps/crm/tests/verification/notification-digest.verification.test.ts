import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("notification-digest auth + wiring", () => {
  it("returns 401 without CRON_SECRET (source contract)", () => {
    const source = readFileSync(
      join(CRM_ROOT, "src/app/api/cron/notification-digest/route.ts"),
      "utf8",
    );
    expect(source).toContain("CRON_SECRET");
    expect(source).toContain("Unauthorized");
    expect(source).toContain("runUnreadNotificationDigest");
  });

  it("registers notification-digest cron in vercel.json", () => {
    const vercel = readFileSync(join(CRM_ROOT, "vercel.json"), "utf8");
    expect(vercel).toContain("/api/cron/notification-digest");
  });

  it("critical path emails founders from heartbeat (source contract)", () => {
    const source = readFileSync(
      join(CRM_ROOT, "src/lib/infra/platform-heartbeat.ts"),
      "utf8",
    );
    expect(source).toContain("sendCriticalHeartbeatEmail");
    expect(source).toContain('severity === "critical"');
  });

  it("realvia thresholds are 48h warning / 7d critical without mailbox gate", () => {
    const source = readFileSync(
      join(CRM_ROOT, "src/lib/infra/platform-heartbeat.ts"),
      "utf8",
    );
    expect(source).toContain("realvia_webhook_stale_48h");
    expect(source).toContain("realvia_webhook_stale_7d");
    expect(source).not.toMatch(
      /inboundMailboxCount\s*>\s*0\s*&&\s*[\s\S]*realviaWebhookTotal/,
    );
  });
});
