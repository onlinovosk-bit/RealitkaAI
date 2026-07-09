import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("platform heartbeat guard", () => {
  it("registers heartbeat-check cron in vercel.json", () => {
    const vercel = readFileSync(join(CRM_ROOT, "vercel.json"), "utf8");
    expect(vercel).toContain("/api/cron/heartbeat-check");
  });

  it("heartbeat cron route requires CRON_SECRET bearer", () => {
    const source = readFileSync(
      join(CRM_ROOT, "src/app/api/cron/heartbeat-check/route.ts"),
      "utf8",
    );
    expect(source).toContain("CRON_SECRET");
    expect(source).toContain("Unauthorized");
    expect(source).toContain("runPlatformHeartbeat");
  });

  it("tenant-health exposes heartbeat signals in snapshot type", () => {
    const source = readFileSync(join(CRM_ROOT, "src/lib/crm-tenant-health.ts"), "utf8");
    expect(source).toContain("heartbeat?:");
    expect(source).toContain("evaluateHeartbeatSignals");
  });

  it("uses received_at for realvia_webhook_logs (schema column)", () => {
    const source = readFileSync(
      join(CRM_ROOT, "src/lib/infra/platform-heartbeat.ts"),
      "utf8",
    );
    expect(source).toContain('realvia_webhook_logs", "received_at"');
    expect(source).not.toContain('realvia_webhook_logs", "created_at"');
  });
});
