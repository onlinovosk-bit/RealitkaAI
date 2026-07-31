import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const CRM_ROOT = process.cwd();

describe("listing generator verification", () => {
  it("exposes SSOT schema and prompt modules", () => {
    expect(fs.existsSync(path.join(CRM_ROOT, "src/lib/ai/schemas/listing-output.ts"))).toBe(true);
    expect(fs.existsSync(path.join(CRM_ROOT, "src/lib/ai/prompts/listing-prompt.ts"))).toBe(true);
  });

  it("has generate-listing API route", () => {
    expect(
      fs.existsSync(path.join(CRM_ROOT, "src/app/api/ai/generate-listing/route.ts")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(CRM_ROOT, "src/app/api/ai/generate-listing/[id]/route.ts")),
    ).toBe(true);
  });

  it("wires UI at /listings/generator", () => {
    const page = path.join(CRM_ROOT, "src/app/(dashboard)/listings/generator/page.tsx");
    expect(fs.existsSync(page)).toBe(true);
    expect(fs.readFileSync(page, "utf8")).toContain("ListingGeneratorForm");
  });

  it("registers navigation entry", () => {
    const nav = fs.readFileSync(path.join(CRM_ROOT, "src/types/navigation.ts"), "utf8");
    expect(nav).toContain("Generátor inzerátov");
    expect(nav).toContain("/listings/generator");
    expect(nav).toContain("file-text");
  });

  it("includes ai_generations migration and allowlist", () => {
    const migrations = fs.readdirSync(path.join(CRM_ROOT, "supabase/migrations"));
    expect(migrations.some((f) => f.includes("ai_generations"))).toBe(true);
    const allowlist = fs.readFileSync(
      path.join(CRM_ROOT, "config/public-schema-allowlist.json"),
      "utf8",
    );
    expect(allowlist).toContain("ai_generations");
  });

  it("form uses crypto.randomUUID idempotency", () => {
    const form = fs.readFileSync(
      path.join(CRM_ROOT, "src/app/(dashboard)/listings/generator/ListingGeneratorForm.tsx"),
      "utf8",
    );
    expect(form).toContain("crypto.randomUUID()");
    expect(form).toContain("/api/ai/generate-listing");
  });

  it("route imports prompt/schema constants not hardcoded strings", () => {
    const route = fs.readFileSync(
      path.join(CRM_ROOT, "src/app/api/ai/generate-listing/route.ts"),
      "utf8",
    );
    expect(route).toContain("LISTING_PROMPT_VERSION");
    expect(route).toContain("listingPromptHash");
    expect(route).toContain("LISTING_OUTPUT_SCHEMA_VERSION");
  });
});
