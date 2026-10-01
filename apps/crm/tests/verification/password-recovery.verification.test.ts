import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("Password recovery auth confirm guard", () => {
  it("exposes /auth/confirm that verifies token_hash via verifyOtp", () => {
    const source = readFileSync(
      join(CRM_ROOT, "src/app/auth/confirm/route.ts"),
      "utf8",
    );
    expect(source).toContain("verifyOtp");
    expect(source).toContain("token_hash");
    expect(source).toContain("/reset-password");
  });

  it("exposes /auth/callback for PKCE code exchange", () => {
    const source = readFileSync(
      join(CRM_ROOT, "src/app/auth/callback/route.ts"),
      "utf8",
    );
    expect(source).toContain("exchangeCodeForSession");
  });

  it("keeps confirm/callback/forgot/reset public in proxy", () => {
    const source = readFileSync(join(CRM_ROOT, "src/proxy.ts"), "utf8");
    for (const path of ["/auth/confirm", "/auth/callback", "/forgot-password", "/reset-password"]) {
      expect(source).toContain(`"${path}"`);
    }
  });

  it("runbook Reset Password template uses TokenHash confirm route", () => {
    const source = readFileSync(
      join(CRM_ROOT, "../../docs/runbooks/supabase-auth-email-templates-sk.md"),
      "utf8",
    );
    expect(source).toContain("/auth/confirm?token_hash={{ .TokenHash }}&type=recovery");
    expect(source).not.toMatch(
      /### Reset Password[\s\S]*?<a href="\{\{ \.ConfirmationURL \}\}">Nastaviť nové heslo<\/a>/,
    );
  });

  it("login links to self-serve forgot-password", () => {
    const source = readFileSync(join(CRM_ROOT, "src/app/login/page.tsx"), "utf8");
    expect(source).toContain('href="/forgot-password"');
  });
});
