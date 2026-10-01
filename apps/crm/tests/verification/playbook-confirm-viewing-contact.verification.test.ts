import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

function read(relative: string): string {
  return readFileSync(join(CRM_ROOT, relative), "utf8");
}

describe("[verification] Playbook viewing confirmation never reaches a fixture contact", () => {
  it("the route reads the lead through the request-scoped client", () => {
    const route = read("src/app/api/playbook/confirm-viewing/route.ts");

    expect(route).toContain('import { createClient } from "@/lib/supabase/server"');
    expect(route).toContain("const supabase = await createClient()");
    expect(route).toContain("getLead(leadId, supabase)");
    expect(route).not.toMatch(/getLead\(leadId\)\s*;/);
  });

  it("an invisible lead is a 404, not a fallback send", () => {
    const route = read("src/app/api/playbook/confirm-viewing/route.ts");

    expect(route).toContain("if (!lead && !demoMode)");
    expect(route).toContain("404");
  });

  it("the fixture contact is gated behind demo mode", () => {
    const route = read("src/app/api/playbook/confirm-viewing/route.ts");

    expect(route).toContain("readDemoModeFromCookie()");
    expect(route).toContain("demoMode ? demoContact(playbookItemId) : undefined");
  });

  it("getLead does not hand out fixture leads in production", () => {
    const store = read("src/lib/leads-store.ts");
    const getLeadBody = store.slice(
      store.indexOf("export async function getLead("),
      store.indexOf("export async function createLead("),
    );

    expect(getLeadBody).toBeTruthy();
    // both fallbacks (no client, failed read) are production-guarded
    const guards = getLeadBody.match(
      /if \(process\.env\.NODE_ENV === "production"\) return undefined;/g,
    );
    expect(guards).toHaveLength(2);
  });
});
