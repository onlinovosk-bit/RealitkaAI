import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CRM_ROOT = join(__dirname, "../..");

/**
 * Live contract: property mutation routes must thread the request-scoped
 * Supabase client into the store. Without it, resolveTenantSupabase falls
 * back to the browser singleton (no cookies) and RLS blocks writes —
 * same failure class as forecasting before #434.
 */
describe("properties scoped supabase (verification)", () => {
  it("PATCH/DELETE /api/properties/[id] pass scoped client into store", () => {
    const src = readFileSync(
      join(CRM_ROOT, "src/app/api/properties/[id]/route.ts"),
      "utf8",
    );
    expect(src).toMatch(/getProperty\(\s*id\s*,\s*supabase\s*\)/);
    expect(src).toMatch(/updateProperty\([\s\S]*supabase\s*\)/);
    expect(src).toMatch(/deleteProperty\(\s*id\s*,\s*supabase\s*\)/);
    expect(src).not.toMatch(/getProperty\(\s*id\s*\)\s*,/);
    expect(src).not.toMatch(/deleteProperty\(\s*id\s*\)\s*;/);
  });

  it("POST /api/properties passes scoped client into createProperty", () => {
    const src = readFileSync(
      join(CRM_ROOT, "src/app/api/properties/route.ts"),
      "utf8",
    );
    expect(src).toMatch(/createProperty\(\{[\s\S]*\}\s*,\s*supabase\s*\)/);
    expect(src).toMatch(/okResponse\(\s*\{\s*property\s*\}/);
  });

  it("create/update/deleteProperty accept optional scoped Supabase client", () => {
    const src = readFileSync(
      join(CRM_ROOT, "src/lib/properties-store.ts"),
      "utf8",
    );
    expect(src).toMatch(
      /export async function createProperty\(\s*input: PropertyInput,\s*scopedSupabase\?/,
    );
    expect(src).toMatch(
      /export async function updateProperty\(\s*id: string,\s*input: Partial<PropertyInput>,\s*scopedSupabase\?/,
    );
    expect(src).toMatch(
      /export async function deleteProperty\(\s*id: string,\s*scopedSupabase\?/,
    );
    expect(src).toMatch(
      /resolveTenantSupabase\(scopedSupabase\)/,
    );
  });
});
