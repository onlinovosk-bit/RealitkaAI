import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("[verification] Acquire email gateway", () => {
  it("route accepts Cloudflare Worker JSON payload with shared-secret auth", () => {
    const route = readFileSync(
      join(CRM_ROOT, "src/app/api/acquire/email/route.ts"),
      "utf8",
    );

    expect(route).toContain("req.json()");
    expect(route).not.toContain("req.text()");
    expect(route).not.toContain("resend.webhooks.verify");
    expect(route).not.toContain("emails.receiving.get");
    expect(route).not.toMatch(/import\s*\{[^}]*agencyForInbound/);
    expect(route).toContain("ACQUIRE_SHARED_SECRET");
    expect(route).toContain("x-shared-secret");
    expect(route).toContain("payload?.mailbox?.agencyId");
    expect(route).toContain("createServiceRoleClient");
  });

  it("agency_id comes from inbound address map, not parsed email", () => {
    const map = readFileSync(
      join(CRM_ROOT, "src/lib/acquire/agency-map.ts"),
      "utf8",
    );

    expect(map).toContain("smolko@inbound.revolis.ai");
    expect(map).toContain("11111111-1111-1111-1111-111111111111");
    expect(map).not.toContain("parseEmail");
  });

  it("middleware and proxy bypass session auth for acquire email webhook", () => {
    const mw = readFileSync(join(CRM_ROOT, "middleware.ts"), "utf8");
    const proxy = readFileSync(join(CRM_ROOT, "src/proxy.ts"), "utf8");
    expect(mw).toContain("'/api/acquire/email'");
    expect(proxy).toContain('"/api/acquire/email"');
  });

  it("route delegates inbound auto-response to shared helper after triage", () => {
    const route = readFileSync(
      join(CRM_ROOT, "src/app/api/acquire/email/route.ts"),
      "utf8",
    );
    const orchestrator = readFileSync(
      join(CRM_ROOT, "src/lib/acquire/inbound-lead-auto-response.ts"),
      "utf8",
    );
    const sender = readFileSync(
      join(CRM_ROOT, "src/lib/acquire/send-inbound-auto-response.ts"),
      "utf8",
    );

    expect(route).toContain("runInboundLeadTriageAndNotify");
    expect(route).toContain("runInboundLeadAutoResponse");
    expect(route).not.toMatch(/from\s+["']resend["']/);
    expect(route).not.toContain("resend.emails.send");
    expect(route).not.toMatch(/catch\s*\{\s*\}/);

    expect(orchestrator).toContain("auto_response_enabled");
    expect(orchestrator).toContain("auto_response_sent_at");
    expect(orchestrator).toContain("loadAgencyAutoResponseContext");
    expect(orchestrator).toContain("autoErrorCapture");
    expect(orchestrator).not.toMatch(/catch\s*\{\s*\}/);

    expect(sender).toContain("replyTo");
    expect(sender).not.toContain("reply_to");
    expect(sender).toContain("buildInboundAutoResponseText");
  });
});
