import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

function read(relative: string): string {
  return readFileSync(join(CRM_ROOT, relative), "utf8");
}

describe("[verification] Outreach never reads leads through the browser singleton", () => {
  it("outreach-store resolves the lead with an explicit client, not listLeads()", () => {
    const store = read("src/lib/outreach-store.ts");

    expect(store).not.toContain("const leads = await listLeads()");
    expect(store).toMatch(/export async function resolveOutreachLead\(/);
    expect(store).toContain("return getLead(leadId, scopedSupabase)");
    expect(store).toContain("getLeadAsService(serviceClient, leadId)");
    expect(store).toMatch(
      /export async function sendAiOutreachEmail\([\s\S]*?scopedSupabase\?: SupabaseClient/,
    );
  });

  it("leads-store exposes service-role readers for background jobs", () => {
    const store = read("src/lib/leads-store.ts");

    expect(store).toMatch(/export async function getLeadAsService\(/);
    expect(store).toMatch(/export async function listLeadsAsService\(/);
  });

  it("every outreach send route threads a scoped client and a human approval", () => {
    // Tier 3: the broker's click is passed as the Control Contract approval.
    for (const route of ["src/app/api/outreach/send/route.ts", "src/app/api/outreach/approve/route.ts"]) {
      expect(read(route)).toMatch(/sendAiOutreachEmail\(leadId, supabase, \{[\s\S]*?approvedBy/);
    }
  });

  it("the outreach sequence threads the client down to every send", () => {
    const sequence = read("src/scripts/outreach-automation-2.0.ts");

    expect(sequence).toMatch(
      /export async function runOutreachSequence\([\s\S]*?client\?: SupabaseClient/,
    );
    expect(sequence).toContain("resolveOutreachLead(leadId, client)");
    expect(sequence).toContain("sendAiOutreachEmail(leadId, client)");
    expect(sequence).not.toMatch(/sendAiOutreachEmail\(leadId\)\s*;/);
  });

  it("the cron is fail-closed, opt-in and reports honest counters", () => {
    const cron = read("src/app/api/scheduled-outreach/route.ts");

    // fail-closed auth, no hand-rolled Bearer compare
    expect(cron).toContain("isAuthorizedCronBearer(req)");
    // explicit service-role client instead of a session-less listLeads()
    expect(cron).not.toContain("listLeads()");
    expect(cron).toContain("createServiceRoleClient()");
    expect(cron).toContain("listLeadsAsService(serviceClient");
    // automatic send to prospects stays opt-in
    expect(cron).toContain("SCHEDULED_OUTREACH_ENABLED");
    // a run that did nothing must not look like a successful run
    expect(cron).toContain("scanned:");
    expect(cron).toContain("sent,");
    expect(cron).toContain("failed,");
    expect(cron).not.toMatch(/return NextResponse\.json\(\{\s*ok:\s*true\s*\}\)/);
  });
});
