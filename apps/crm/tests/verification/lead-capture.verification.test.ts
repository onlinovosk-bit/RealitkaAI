import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("[verification] Lead capture (W-LEADS)", () => {
  it("POST /api/leads requires session and scopes to caller agency", () => {
    const route = readFileSync(
      join(CRM_ROOT, "src/app/api/leads/route.ts"),
      "utf8",
    );

    expect(route).toContain('if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })');
    expect(route).toContain('.from("profiles")');
    expect(route).toContain('select("agency_id")');
    expect(route).toContain("linkProfileToAuthUser");
    expect(route).toContain("agencyId");
    expect(route).toContain("createLead(");
    expect(route).toContain("supabaseAuth");
    expect(route).toContain("okResponse({ lead })");
  });

  it("full capture page posts to POST /api/leads and redirects to lead detail", () => {
    const page = readFileSync(
      join(CRM_ROOT, "src/app/(dashboard)/leads/new/page.tsx"),
      "utf8",
    );

    expect(page).toContain('fetch("/api/leads"');
    expect(page).toContain('method: "POST"');
    expect(page).toContain("router.push(`/leads/${data.lead.id}`)");
  });

  it("createLead uses scoped server client when provided", () => {
    const store = readFileSync(
      join(CRM_ROOT, "src/lib/leads-store.ts"),
      "utf8",
    );

    expect(store).toContain("resolveTenantSupabase(scoped)");
  });

  it("quick capture form links to full /leads/new route", () => {
    const form = readFileSync(
      join(CRM_ROOT, "src/components/leads/lead-create-form.tsx"),
      "utf8",
    );

    expect(form).toContain('href="/leads/new"');
    expect(form).toContain('htmlFor="lead-quick-name"');
  });
});
